import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MoviesController } from './movies.controller';
import { MoviesService } from './movies.service';
import { Movie, MovieSchema } from '../../schemas/movie.schema';
import { ContentView, ContentViewSchema } from '../../schemas/content-view.schema';

@Module({
  imports: [MongooseModule.forFeature([
    { name: Movie.name, schema: MovieSchema },
    { name: ContentView.name, schema: ContentViewSchema },
  ])],
  controllers: [MoviesController],
  providers: [MoviesService],
  exports: [MoviesService],
})
export class MoviesModule {}
