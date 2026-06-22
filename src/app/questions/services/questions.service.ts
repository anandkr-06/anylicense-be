import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { GetCategoryGroupsDto } from '../dto/get-category-groups.dto';
import { GetQuestionsByCategoryDto } from '../dto/get-questions-by-category.dto';
import { Question, QuestionDocument } from '../schema/question.schema';
import { SubmitCategoryAnswersDto } from '../dto/submit-category-answers.dto';

const FIXED_QUESTION_LIMIT = 1;

@Injectable()
export class QuestionsService {
  constructor(
    @InjectModel(Question.name)
    private readonly questionModel: Model<QuestionDocument>,
  ) {}

  async getCategoryGroups(filters: GetCategoryGroupsDto) {
    const match: FilterQuery<QuestionDocument> = {};

    if (filters.vehicleType?.trim()) {
      match.vehicleType = filters.vehicleType.trim();
    }

    if (filters.category?.trim()) {
      match.category = {
        $regex: this.escapeRegex(filters.category.trim()),
        $options: 'i',
      };
    }

    return this.questionModel
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            category: '$_id',
            count: 1,
          },
        },
        { $sort: { category: 1 } },
      ])
      .exec();
  }

  async getQuestionsByCategory(query: GetQuestionsByCategoryDto) {
    const page = query.page || 1;
    const skip = (page - 1) * FIXED_QUESTION_LIMIT;
    const filter = { category: query.category };

    const [total, questions] = await Promise.all([
      this.questionModel.countDocuments(filter).exec(),
      this.questionModel
        .find(filter)
        .sort({ code: 1 })
        .skip(skip)
        .limit(FIXED_QUESTION_LIMIT)
        .lean()
        .exec(),
    ]);

    return {
      data: questions,
      meta: {
        page,
        limit: FIXED_QUESTION_LIMIT,
        total,
        totalPages: Math.ceil(total / FIXED_QUESTION_LIMIT),
      },
    };
  }

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async submitCategoryAnswers(body: SubmitCategoryAnswersDto) {
      const category = body.category.trim();
      const submittedAnswers = new Map(
        body.answers.map((answer) => [answer.questionId, answer.answer]),
      );
  
      if (submittedAnswers.size !== body.answers.length) {
        throw new BadRequestException('Duplicate question IDs are not allowed.');
      }
  
      const questionIds = [...submittedAnswers.keys()].map(
        (questionId) => new Types.ObjectId(questionId),
      );
  
      const [totalQuestions, questions] = await Promise.all([
        this.questionModel.countDocuments({ category }).exec(),
        this.questionModel
          .find({
            _id: { $in: questionIds },
            category,
          })
          .select('_id code question options correctOptionIndex correctAnswer')
          .lean()
          .exec(),
      ]);
  
      if (!totalQuestions) {
        throw new BadRequestException('No questions found for selected category.');
      }
  
      if (questions.length !== submittedAnswers.size) {
        throw new BadRequestException(
          'Some submitted question IDs were not found in the selected category.',
        );
      }
  
      const results = questions.map((question) => {
        const submittedAnswer = submittedAnswers.get(String(question._id));
        const isCorrect = this.isCorrectAnswer(
          submittedAnswer,
          question.correctOptionIndex,
          question.correctAnswer,
        );
  
        return {
          questionId: String(question._id),
          code: question.code,
          question: question.question,
          submittedAnswer,
          correctOptionIndex: question.correctOptionIndex,
          correctAnswer: question.correctAnswer,
          marks: isCorrect ? 1 : 0,
          isCorrect,
        };
      });
  
      const obtainedMarks = results.reduce((sum, result) => sum + result.marks, 0);
      const percentage = Number(
        ((obtainedMarks / totalQuestions) * 100).toFixed(2),
      );
  
      return {
        category,
        totalQuestions,
        submittedQuestions: results.length,
        totalMarks: totalQuestions,
        obtainedMarks,
        percentage,
        // results,
      };
    }
  
  
    private isCorrectAnswer(
      submittedAnswer: string | number | undefined,
      correctOptionIndex: number,
      correctAnswer: string,
    ) {
      if (submittedAnswer === undefined || submittedAnswer === null) {
        return false;
      }
  
      if (typeof submittedAnswer === 'number') {
        return submittedAnswer === correctOptionIndex;
      }
  
      const normalizedSubmittedAnswer = submittedAnswer.trim().toLowerCase();
  
      if (/^\d+$/.test(normalizedSubmittedAnswer)) {
        return Number(normalizedSubmittedAnswer) === correctOptionIndex;
      }
  
      return normalizedSubmittedAnswer === correctAnswer.trim().toLowerCase();
    }

    async getQuestionFilters() {
    const [vehicleTypes, categories] = await Promise.all([
      this.questionModel.distinct('vehicleType', { vehicleType: { $ne: null } }),
      this.questionModel.distinct('category', { category: { $ne: null } }),
    ]);

    return {
      vehicleTypes: vehicleTypes.sort(),
      categories: categories.sort(),
    };
  }
}
