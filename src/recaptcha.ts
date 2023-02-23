import { env } from "./env";

const checkRecaptcha = (g_response: string): Promise<boolean> => {
  return new Promise<boolean>((resolve) => {
    fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${env.recaptcha_key}&response=${g_response}`,
    })
      .then((res) => {
        res.json().then((json) => {
          resolve(json.success);
        });
      })
      .catch((err) => {
        resolve(false);
      });
  });
};

export { checkRecaptcha };
