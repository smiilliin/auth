import assert from "assert";
import dotenv from "dotenv";
import { env } from "./env";
import crypto from "crypto";

dotenv.config({ path: ".test.env" });

describe(`AUTH`, async () => {
  let strings: any;
  it(`Get Strings`, async () => {
    strings = await (await fetch(`${env.host}/strings/${env.lang}`)).json();
  });

  let refreshToken: string;
  it(`Get Refresh Token`, async () => {
    const res = await fetch(`${env.host}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: env.id,
        password: crypto.createHash("sha256").update(Buffer.from(env.password, "utf-8")).digest("hex"),
      }),
    });
    const data = await res.json();

    if (res.status !== 200) {
      const { reason } = data;

      if (reason) {
        throw new Error(strings[reason]);
      }
      throw new Error(strings["UNKNOWN_ERROR"]);
    } else {
      refreshToken = data["refresh-token"];
      assert(refreshToken);
    }
  });
  it(`Get Access Token`, async () => {
    const res = await fetch(`${env.host}/access-token`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: refreshToken,
      },
    });
    const data = await res.json();

    if (res.status !== 200) {
      const { reason } = data;

      if (reason) {
        throw new Error(strings[reason]);
      }
      throw new Error(strings["UNKNOWN_ERROR"]);
    } else {
      const accessToken = data["access-token"];
      assert(accessToken);
    }
  });
  it(`Update Refresh Token`, async () => {
    const res = await fetch(`${env.host}/refresh-token`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: refreshToken,
      },
    });
    const data = await res.json();

    if (res.status !== 200) {
      const { reason } = data;

      if (reason) {
        throw new Error(strings[reason]);
      }
      throw new Error(strings["UNKNOWN_ERROR"]);
    } else {
      refreshToken = data["refresh-token"];
      assert(refreshToken);
    }
  });
});
