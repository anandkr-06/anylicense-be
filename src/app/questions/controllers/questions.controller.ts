import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { GetCategoryGroupsDto } from '../dto/get-category-groups.dto';
import { GetQuestionsByCategoryDto } from '../dto/get-questions-by-category.dto';
import { QuestionsService } from '../services/questions.service';
import { Public } from '@common/decorators/public.decorator';
import { SubmitCategoryAnswersDto } from '../dto/submit-category-answers.dto';


@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}
@Public()
  @Get('categories')
  getCategoryGroups(@Query() query: GetCategoryGroupsDto) {
    return this.questionsService.getCategoryGroups(query);
  }
@Public()
  @Get()
  getQuestionsByCategory(@Query() query: GetQuestionsByCategoryDto) {
    return this.questionsService.getQuestionsByCategory(query);
  }
@Public()
  @Post('submit')
    submitCategoryAnswers(@Body() body: SubmitCategoryAnswersDto) {
      return this.questionsService.submitCategoryAnswers(body);
    }
}
