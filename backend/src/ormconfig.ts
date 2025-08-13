import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { FileInfo } from "./geodata/entities/file-info.entity";
import { Observation } from "./observations/entities/observation.entity";
import { ObservationRefresh } from "./observation_refresh_log/entities/observation-refresh-log.entity";

const ormconfig: TypeOrmModuleOptions = {
  logging: ["error"],
  type: "postgres",
  host: process.env.POSTGRES_HOST || "postgres",
  port: 5432,
  database: process.env.POSTGRES_DATABASE || "enmodswr",
  username: process.env.POSTGRES_USER || "enmodswr",
  password: process.env.POSTGRES_PASSWORD || "enmodswr_password",
  entities: [FileInfo, Observation, ObservationRefresh],
  synchronize: false,
};
export default ormconfig;
