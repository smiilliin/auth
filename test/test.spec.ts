import assert from "assert";
import dotenv from "dotenv";
import { env } from "./env";
import crypto from "crypto";
import AuthAPI from "./authAPI";

dotenv.config({ path: ".test.env" });

const authAPI = new AuthAPI(env.lang, env.host);
describe(`AUTH`, async () => {
  let refreshToken: string;
  it(`Login`, async () => {
    const data = await authAPI.login(env.id, env.password);
    refreshToken = data["refresh-token"];
    assert(refreshToken);
  });
  it(`Get Access Token`, async () => {
    const { "access-token": accessToken } = await authAPI.getAccessToken(refreshToken);
    assert(accessToken);
  });
  it(`Update Refresh Token`, async () => {
    const { "refresh-token": newRefreshToken } = await authAPI.getRefreshToken(refreshToken);
    assert(newRefreshToken);
  });
});
