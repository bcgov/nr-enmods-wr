import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({ name: "observation_refresh_log" })
export class ObservationRefresh {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "timestamp", name: "last_success" })
  lastSuccess: Date;
}
