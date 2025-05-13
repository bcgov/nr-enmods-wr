import { HttpException, HttpStatus, Logger } from "@nestjs/common";

 const logger = new Logger('ValidateDTO')

 export function validateDto<S>(obj: S) {
    let isEmpty = true;
    for (const key in obj) {    
      if (Array.isArray(obj[key])) {
        if (obj[key].length > 0) {
          isEmpty = false;
          break;
        }
      } else if (obj[key] !== null) {
        isEmpty = false;
        break;
      }
    }
    logger.log("Is basic search input fields empty? " + isEmpty)
    if (isEmpty) {
      let errArr: string[] = [];
      errArr.push("Please enter at least one input field.");
      throw new HttpException({error: errArr}, HttpStatus.BAD_REQUEST);
    }
  }