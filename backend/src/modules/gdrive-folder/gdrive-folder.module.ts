import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GdriveFolderController } from './gdrive-folder.controller';
import { GdriveFolderService } from './gdrive-folder.service';
import { SeriesModule } from '../series/series.module';
import { Movie, MovieSchema } from '../../schemas/movie.schema';

@Module({
  imports: [
    SeriesModule,
    MongooseModule.forFeature([{ name: Movie.name, schema: MovieSchema }]),
  ],
  controllers: [GdriveFolderController],
  providers: [GdriveFolderService],
})
export class GdriveFolderModule {}
