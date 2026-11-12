# Butuh: pip install requests
import time

import requests

BASE = "https://tikobox.my.id"

session = requests.Session()
session.headers["User-Agent"] = "MyTikoboxClient/1.0"


class TikoboxError(Exception):
    def __init__(self, message, status):
        super().__init__(f"{status} {message}")
        self.status = status


def api(path, params=None, retries=2):
    for attempt in range(retries + 1):
        res = session.get(BASE + path, params=params, timeout=35)
        try:
            body = res.json()
        except ValueError:
            body = {"code": -1, "msg": f"HTTP {res.status_code}"}

        # 429: tunggu sesuai header retry-after lalu ulangi
        if res.status_code == 429 and attempt < retries:
            time.sleep(int(res.headers.get("retry-after", 5)))
            continue
        if body.get("code") != 0:
            raise TikoboxError(body.get("msg", "error"), res.status_code)
        return body["data"]


def get_video(link):
    return api("/api/tiktok", {"url": link})


def get_profile(username):
    return api("/api/user", {"unique_id": username})


def get_hashtag(name):
    return api("/api/hashtag", {"name": name})


def save_media(media_url, filename, cookie=""):
    params = {"url": media_url, "name": filename}
    if cookie:
        params["c"] = cookie

    with session.get(BASE + "/api/download", params=params, stream=True, timeout=35) as res:
        if not res.ok:
            raise TikoboxError(res.json().get("msg", "error"), res.status_code)
        with open(filename, "wb") as f:
            for chunk in res.iter_content(chunk_size=65536):
                f.write(chunk)
    print("tersimpan:", filename)


if __name__ == "__main__":
    video = get_video("https://vt.tiktok.com/ZSxxxxxxx/")
    cookie = video.get("cookie", "")

    if video.get("images"):
        for i, image in enumerate(video["images"], start=1):
            save_media(image, f"{video['id']}-{i}.jpg", cookie)
    else:
        save_media(video["play"], f"{video['id']}.mp4", cookie)
    if video["music"]:
        save_media(video["music"], f"{video['id']}.mp3", cookie)

    print(get_profile("tiktok"))
    print(get_hashtag("fyp"))
