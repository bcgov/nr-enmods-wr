import { Controller } from "@nestjs/common";
import { GeodataService } from "./geodata.service";

@Controller("geodata")
export class GeodataController {
  constructor(private readonly geodataService: GeodataService) {}
}
