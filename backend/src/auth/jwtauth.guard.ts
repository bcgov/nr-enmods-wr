import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { IS_PUBLIC_KEY } from "./decorators/public.decorator";

@Injectable()
/**
 * An API guard used to indicate if the decorated API requires authenticaiton.  If the API's class (or method) is decorated with @Public, then authentication is not required.
 */
export class JwtAuthGuard extends AuthGuard("jwt") {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    } else {
      return super.canActivate(context);
    }
  }
  handleRequest(err, user, info) {
    if (err || !user) {
      this.logger.error(
        `JWT is not Valid. Err: ${err}. - User ${user}. Info ${info}`
      );
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
