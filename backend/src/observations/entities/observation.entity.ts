import { Entity, Column, PrimaryColumn } from "typeorm";

@Entity({ name: "observations" })
export class Observation {
  @PrimaryColumn()
  id: string;

  @Column({ type: "jsonb" })
  data: any;
}
