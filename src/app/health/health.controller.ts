import { commonSwaggerSuccess } from '@lib/swagger/swagger-decorator';
import { All, Controller, HttpCode, HttpStatus } from '@nestjs/common';

@Controller('health-checkup')
export class HealthController {
  @All()
  @HttpCode(HttpStatus.OK)
  @commonSwaggerSuccess('Health Checukup', {
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
  public checkHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
