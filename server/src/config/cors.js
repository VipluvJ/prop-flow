import cors from "cors";
import { env } from "./env.js";

const corsOptions = {
  origin: env.FRONTEND_URL,
  credentials: true,
};

export default cors(corsOptions);
