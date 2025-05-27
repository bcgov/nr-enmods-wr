import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity("file_info")
export class FileInfo {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "file_name", type: "varchar", length: 100, nullable: false })
  file_name: string;

  @CreateDateColumn({ name: "when_created", type: "timestamp" })
  when_created: Date;
}
