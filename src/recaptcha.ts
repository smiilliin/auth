import https from "https";

const checkRecaptcha = (g_response: string): Promise<boolean> => {
  //   return new Promise<boolean>((resolve) => {
  //     const req = https.request("https://www.google.com/recaptcha/api/siteverify");
  //     req.write({
  //       secret: process.env["RECAPTCHA_KEY"],
  //       response: g_response,
  //     });
  //     req.end();
  //   });
  return new Promise<boolean>((resolve) => {
    fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${process.env["RECAPTCHA_KEY"]}&response=${g_response}`,
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
