import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Moissonneur API')
    .setDescription('API permettant la gestion du moissonneur')
    .setExternalDoc(
      'Documentation technique',
      'https://adresse-data-gouv-fr.gitbook.io/bal/moissonneur',
    )
    .setVersion('1.0')
    .addServer(process.env.MOISSONNEUR_URL)
    .addBearerAuth(
      {
        description: `Please enter the authentication token`,
        name: 'Authorization',
        type: 'http',
        in: 'Header',
      },
      'admin-token',
    )
    .build();
  app.useGlobalPipes(new ValidationPipe());
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT || 7000);
}
bootstrap();
