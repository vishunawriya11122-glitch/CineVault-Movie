import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SeriesController } from './series.controller';
import { SeriesService } from './series.service';
import { Season, SeasonSchema, Episode, EpisodeSchema } from '../../schemas/series.schema';
import { ContentView, ContentViewSchema } from '../../schemas/content-view.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Season.name, schema: SeasonSchema },
      { name: Episode.name, schema: EpisodeSchema },
      { name: ContentView.name, schema: ContentViewSchema },
    ]),
  ],
  controllers: [SeriesController],
  providers: [SeriesService],
  exports: [SeriesService],
})
export class SeriesModule {}
