import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { AxiosResponse } from "@nestjs/terminus/dist/health-indicator/http/axios.interfaces";
import { firstValueFrom } from "rxjs";

@Injectable()
export class SearchService {
  constructor(private readonly httpService: HttpService) {}

  async exportData(request: any): Promise<AxiosResponse<any>> {
    
    try {
      const res = await firstValueFrom(this.httpService.get(process.env.BASIC_SEARCH_BC_API, {
        params: {
          ids: request.query.locationType
        }
      }));      
      if (res.status === 200)       
        return res;
      
    } catch (error) {
      console.error(error);
    }

  }
}
