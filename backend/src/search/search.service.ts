import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { AxiosResponse } from "@nestjs/terminus/dist/health-indicator/http/axios.interfaces";
import { firstValueFrom } from "rxjs";

@Injectable()
export class SearchService {
  constructor(private readonly httpService: HttpService) {}

  async exportData(request: any): Promise<AxiosResponse<any>> {
    try {
      const url = process.env.BASE_URL_BC_API + process.env.BASIC_SEARCH_BC_API;
      const res = await firstValueFrom(
        this.httpService.get(url, {
          params: {
            ids: "2cbfe534-e0a3-448d-ba8f-1d1919d66f9a", //TODO remove hardcoded
          },
        })
      );
      if (res.status === 200) return res;
    } catch (err) {
      console.error(err);
    }
  }

  async getLocationTypes(): Promise<AxiosResponse<any>> {
    try {
      const url =
        process.env.BASE_URL_BC_API + process.env.LOCATION_TYPE_CODE_TABLE_API;
      const res = await firstValueFrom(this.httpService.get(url));
      if (res.status === 200) {
        const data = JSON.parse(res.data);
        sortArr(data.domainObjects, "customId");
        return data;
      }
    } catch (err) {
      console.error(err);
    }
  }

  async getLocationNames(query: string): Promise<AxiosResponse<any>> {
    try {
      const url =
        process.env.BASE_URL_BC_API + process.env.LOCATION_NAME_CODE_TABLE_API;
      const res = await firstValueFrom(
        this.httpService.get(url, {
          params: {
            limit: 100,
            search: query,
            sort: "asc",
          },
        })
      );
      if (res.status === 200) return JSON.parse(res.data);
    } catch (err) {
      console.error(err);
    }
  }

  async getPermitNumbers(query: string): Promise<AxiosResponse<any>> {
    try {
      const url =
        process.env.BASE_URL_BC_API + process.env.PERMIT_NUMBER_CODE_TABLE_API;
      const res = await firstValueFrom(
        this.httpService.get(url, {
          params: {
            limit: 100,
            search: query,
          },
        })
      );
      if (res.status === 200) {
        const data = JSON.parse(res.data);
        sortArr(data.domainObjects, "customId");
        return data;
      }
    } catch (err) {
      console.error(err);
    }
  }

  async getMediums(query: string): Promise<AxiosResponse<any>> {
    try {
      const url =
        process.env.BASE_URL_BC_API + process.env.MEDIA_CODE_TABLE_API;
      const res = await firstValueFrom(
        this.httpService.get(url, {
          params: {
            limit: 100,
            search: query,
          },
        })
      );
      if (res.status === 200) {
        const data = JSON.parse(res.data);
        sortArr(data.domainObjects, "customId");
        return data;
      }
    } catch (err) {
      console.error(err);
    }
  }

  async getObservedProperties(query: string): Promise<AxiosResponse<any>> {
    try {
      const url =
        process.env.BASE_URL_BC_API +
        process.env.OBSERVED_PROPERTIES_CODE_TABLE_API;
      const res = await firstValueFrom(
        this.httpService.get(url, {
          params: {
            limit: 100,
            search: query,
          },
        })
      );
      if (res.status === 200) {
        const data = JSON.parse(res.data);
        sortArr(data.domainObjects, "customId");
        return data;
      }
    } catch (err) {
      console.error(err);
    }
  }
}

//TODO: move to utility
function sortArr(arr: any, sortName: string) {
  arr.sort((a: any, b: any) => {
    if (a[sortName] < b[sortName]) return -1;
    if (a[sortName] > b[sortName]) return 1;
    return 0;
  });
}
