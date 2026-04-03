import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { R2StorageController } from './r2-storage.controller';
import { R2StorageService } from './r2-storage.service';
import { Movie, MovieSchema } from '../../schemas/movie.schema';
import { Season, SeasonSchema, Episode, EpisodeSchema } from '../../schemas/series.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Movie.name, schema: MovieSchema },
      { name: Season.name, schema: SeasonSchema },
      { name: Episode.name, schema: EpisodeSchema },
    ]),
  ],
  controllers: [R2StorageController],
  providers: [R2StorageService],
  exports: [R2StorageService],
})
export class R2StorageModule {}
