import crypto from "crypto";

interface IError {
  reason: string;
}
interface IRefreshToken {
  "refresh-token": string;
}
interface IAccessToken {
  "access-token": string;
}

class AuthAPI {
  host: string;
  lang: string;
  strings: any;

  constructor(lang: string, host: string = "") {
    this.host = host;
    this.lang = lang;
    this.strings = {
      UNKNOWN_ERROR: "An unknown error has occurred.",
    };

    fetch(`${this.host}/strings/${lang}.json`)
      .then((res) => res.json())
      .then((data) => {
        this.strings = data;
      });
  }
  private async fetchWithStrings(path: string, option: RequestInit) {
    const res = await fetch(`${this.host}${path}`, option);
    let data: IError | any;

    if (res.headers.get("content-type")?.includes("application/json")) {
      data = await res.json();
    } else {
      data = {
        reason: "UNKNOWN_ERROR",
      };
    }

    if (res.status !== 200) {
      const { reason } = data as IError;

      const reasonText = this.strings[reason];

      if (!reasonText) {
        throw new Error(this.strings["UNKNOWN_ERROR"]);
      }

      throw new Error(this.strings[reason]);
    } else {
      return data;
    }
  }

  async login(id: string, password: string): Promise<IRefreshToken> {
    return this.fetchWithStrings("/login/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: id,
        password: crypto.createHash("sha256").update(Buffer.from(password, "utf-8")).digest("hex"),
      }),
    });
  }
  async signup(id: string, password: string, g_response: string): Promise<IRefreshToken> {
    return this.fetchWithStrings("/signup/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: id,
        password: crypto.createHash("sha256").update(Buffer.from(password, "utf-8")).digest("hex"),
        g_response: g_response,
      }),
    });
  }
  async getAccessToken(refreshToken: string): Promise<IAccessToken> {
    return this.fetchWithStrings("/access-token/", {
      method: "GET",
      headers: {
        Authorization: refreshToken,
      },
    });
  }
  async getRefreshToken(refreshToken: string): Promise<IRefreshToken> {
    return this.fetchWithStrings("/refresh-token/", {
      method: "GET",
      headers: {
        Authorization: refreshToken,
      },
    });
  }
}

export default AuthAPI;
