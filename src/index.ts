import TokenGeneration from "token-generation";
import crypto from "crypto";
import fs from "fs";
import express from "express";
import mysql from "mysql";
import { checkRecaptcha } from "./recaptcha";
import Strings from "./strings";
import { env } from "./env";

const hmacKey = Buffer.from(fs.readFileSync("../hmacKey").toString(), "hex"); //HMAC KEY

const dbConfig = {
  host: env.db_host,
  user: env.db_user,
  password: env.db_password,
  database: env.db_database,
};
const pool = mysql.createPool(dbConfig);

const generation = new TokenGeneration(dbConfig, hmacKey);

const app = express();

app.use(express.json());
app.set("etag", false);
app.disable("x-powered-by");

const idRegex = (id: string) => {
  return typeof id === "string" && /^[a-z0-9]{4,20}$/.test(id);
};
const passwordRegex = (password: string) => {
  return typeof password === "string" && /^[a-fA-F0-9]{64}$|^0x[a-fA-F0-9]{64}$/.test(password);
};

interface IUserQuery {
  id: string;
  salt: Buffer;
  password: Buffer;
}

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE, PUT, PATCH");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

app.post("/login", async (req, res) => {
  const { id, password } = req.body;

  if (!idRegex(id) || !passwordRegex(password)) {
    return res.status(400).send({
      reason: "ID_OR_PASSWORD_WRONG",
    });
  }

  pool.getConnection((err, connection) => {
    if (err) {
      console.error(err);

      return res.status(400).send({
        reason: "UNKNOWN_ERROR",
      });
    }

    try {
      connection.query(`SELECT * FROM user WHERE id=?`, [id], async (err, results: Array<IUserQuery>) => {
        if (err) {
          return res.status(400).send({
            reason: "UNKNOWN_ERROR",
          });
        }

        if (results.length == 0) {
          return res.status(400).send({
            reason: "ID_OR_PASSWORD_WRONG",
          });
        }
        const { salt, password: dbPassword } = results[0];

        const saltedPassword = Buffer.concat([salt, Buffer.from(password, "hex")]);
        const hashedPassword = crypto.createHash("sha256").update(saltedPassword).digest("hex");

        if (dbPassword.equals(Buffer.from(hashedPassword, "hex"))) {
          const refreshToken = await generation.createRefreshToken(id, 20);

          if (refreshToken) {
            const refreshTokenString = generation.tokenToString(refreshToken);

            res.cookie("refresh-token", refreshTokenString, {
              httpOnly: true,
              domain: env.cookie_domain,
              secure: true,
            });

            return res.status(200).send({
              "refresh-token": refreshTokenString,
            });
          }

          return res.status(400).send({
            reason: "UNKNOWN_ERROR",
          });
        }

        return res.status(400).send({
          reason: "ID_OR_PASSWORD_WRONG",
        });
      });
    } finally {
      connection.release();
    }
  });
});
app.post("/signup", async (req, res) => {
  const { id, password, g_response } = req.body;
  if (!(await checkRecaptcha(g_response))) {
    return res.status(400).send({
      reason: "RECAPTCHA_WRONG",
    });
  }

  if (!idRegex(id) || !passwordRegex(password)) {
    return res.status(400).send({
      reason: "ID_OR_PASSWORD_WRONG",
    });
  }

  pool.getConnection((err, connection) => {
    if (err) {
      console.error(err);

      return res.status(400).send({
        reason: "UNKNOWN_ERROR",
      });
    }

    try {
      const salt = crypto.randomBytes(8);
      const saltedPassword = Buffer.concat([salt, Buffer.from(password, "hex")]);
      const hashedPassword = crypto.createHash("sha256").update(saltedPassword).digest("hex");

      connection.query(
        `INSERT INTO user VALUES(?, ?, ?);`,
        [id, salt, Buffer.from(hashedPassword, "hex")],
        async (err) => {
          if (err) {
            return res.status(400).send({
              reason: "ID_DUPLICATE",
            });
          }
          const refreshToken = await generation.createRefreshToken(id, 20);

          if (refreshToken) {
            const refreshTokenString = generation.tokenToString(refreshToken);

            res.cookie("refresh-token", refreshTokenString, {
              httpOnly: true,
              domain: env.cookie_domain,
              secure: true,
            });

            return res.status(200).send({
              "refresh-token": refreshTokenString,
            });
          }

          return res.status(400).send({
            reason: "UNKNOWN_ERROR",
          });
        }
      );
    } finally {
      connection.release();
    }
  });
});
app.get("/logout", (req, res) => {
  res.clearCookie("refresh-token", { httpOnly: true, expires: new Date(1), domain: env.cookie_domain, secure: true });

  res.status(200).send({});
});
app.get("/access-token", async (req, res) => {
  const tokenString = req.headers.authorization;
  const token = generation.verifyRefreshToken(tokenString);

  if (!token) {
    return res.status(400).send({
      reason: "TOKEN_WRONG",
    });
  }
  const accessToken = await generation.createAccessToken(token, 30);
  if (!accessToken) {
    return res.status(400).send({
      reason: "TOKEN_WRONG",
    });
  }
  return res.status(200).send({
    "access-token": generation.tokenToString(accessToken),
  });
});
app.get("/refresh-token", async (req, res) => {
  const tokenString = req.headers.authorization;
  const token = generation.verifyRefreshToken(tokenString);
  if (!token) {
    return res.status(400).send({
      reason: "TOKEN_WRONG",
    });
  }
  const updatedToken = await generation.updateRefreshToken(token, 20);

  if (!updatedToken) {
    return res.status(400).send({
      reason: "TOKEN_WRONG",
    });
  }

  const updatedTokenString = generation.tokenToString(updatedToken);

  res.cookie("refresh-token", updatedTokenString, {
    httpOnly: true,
    domain: env.cookie_domain,
    secure: true,
  });

  return res.status(200).send({
    "refresh-token": updatedTokenString,
  });
});

const strings = new Strings();
strings.use(app);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).send({
    reason: "UNKNOWN_ERROR",
  });
});

app.listen(env.port, () => {
  console.log(`The program is running on port ${env.port}`);
});
