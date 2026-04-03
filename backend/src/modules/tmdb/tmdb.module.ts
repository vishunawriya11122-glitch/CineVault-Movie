import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TmdbController } from './tmdb.controller';
import { TmdbService } from './tmdb.service';
import { Movie, MovieSchema } from '../../schemas/movie.schema';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Movie.name, schema: MovieSchema }]),
    SettingsModule,
  ],
  controllers: [TmdbController],
  providers: [TmdbService],
})
export class TmdbModule {}
