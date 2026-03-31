import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Movie, MovieSchema } from '../../schemas/movie.schema';
import { Season, SeasonSchema, Episode, EpisodeSchema } from '../../schemas/series.schema';
import { BunnyService } from './bunny.service';
import { BunnyController } from './bunny.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Movie.name, schema: MovieSchema },
      { name: Season.name, schema: SeasonSchema },
      { name: Episode.name, schema: EpisodeSchema },
    ]),
  ],
  controllers: [BunnyController],
  providers: [BunnyService],
  exports: [BunnyService],
})
export class BunnyModule {}
