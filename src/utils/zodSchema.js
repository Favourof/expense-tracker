const { z } = require("zod");

const UserZodSchema = z.object({
  firstName: z.string().min(1, {
    message: "First name is required",
  }),
  email: z
    .string()
    .email()
    .nonempty({
      message: "Email address is required",
    })
    .transform((str) => str.toLowerCase()),

  password: z.string().min(1, {
    message: "Password is required",
  }),
  gender: z.enum(["male", "female"], {
    errorMap: (issue, ctx) => ({
      message: `${ctx.data} is not a valid gender. Gender must be either 'male' or 'female'.`,
    }),
  }),
  image: z.string().min(1, {
    message: "image is required",
  }),
});

module.exports = { UserZodSchema };
