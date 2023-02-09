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
  return /^[a-z0-9]{5,20}$/.test(id);
};
const passwordRegex = (password: string) => {
  return /^[a-fA-F0-9]{64}$/.test(password);
};

interface IUserQuery {
  id: string;
  salt: Buffer;
  password: Buffer;
}

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
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
    try {
      if (err) {
        return res.status(400).send({
          reason: "UNKNOWN_ERROR",
        });
      }

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
            return res.status(200).send({
              "refresh-token": generation.tokenToString(refreshToken),
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
    try {
      if (err) {
        return res.status(400).send({
          reason: "UNKNOWN_ERROR",
        });
      }

      const salt = crypto.randomBytes(8);
      const saltedPassword = Buffer.concat([salt, Buffer.from(password, "hex")]);
      const hashedPassword = crypto.createHash("sha256").update(saltedPassword).digest("hex");

      connection.query(
        `INSERT INTO USER VALUES(?, ?, ?);`,
        [id, salt, Buffer.from(hashedPassword, "hex")],
        async (err) => {
          if (err) {
            return res.status(400).send({
              reason: "ID_DUPLICATE",
            });
          }
          const refreshToken = await generation.createRefreshToken(id, 20);

          if (refreshToken) {
            return res.status(200).send({
              "refresh-token": generation.tokenToString(refreshToken),
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

  return res.status(200).send({
    "refresh-token": generation.tokenToString(updatedToken),
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
