import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { FileInfo } from "./geodata/entities/file-info.entity";

const ormconfig: TypeOrmModuleOptions = {
  logging: ["error"],
  type: "postgres",
  host: process.env.POSTGRES_HOST || "postgres",
  port: 5432,
  database: process.env.POSTGRES_DATABASE || "enmodswr",
  username: process.env.POSTGRES_USER || "enmodswr",
  password: process.env.POSTGRES_PASSWORD || "enmodswr_password",
  entities: [FileInfo],
  synchronize: false,
};

export default ormconfig;
