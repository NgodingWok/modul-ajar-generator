[fork]: /fork
[vercel]: https://vercel.com

# Deploy to Vercel

As you can see, this project includes a `vercel.json` file containing the configuration for Vercel deployment. Follow the steps below to deploy:

> [!NOTE]
> To change the OpenAI base URL, you can update the `OPENAI_BASE_URL` environment variable in Vercel according to your needs.

## Quick Start with Deploy Button

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FNgodingCik%2Fmodul-ajar-generator&env=APP_NAME,APP_ORIGIN_HOSTS,APP_PORT,APP_HOST,APP_API_BASE_URL,APP_USE_BUILTIN_API,CORS_TRUSTED_HOSTS,CORS_TRUSTED_CDN_HOSTS,OPENAI_API_KEY,OPENAI_MODEL&envDefaults=%7B%22APP_NAME%22%3A%22My%20App%22%2C%APP_ORIGIN_HOSTS%22%3A%22*%22%2C%22APP_PORT%22%3A%223000%22%2C%22APP_HOST%22%3A%220.0.0.0%22%2C%22APP_API_BASE_URL%22%3A%22http%3A%2F%2Flocalhost%3A3000%2Fapi%22%2C%22APP_USE_BUILTIN_API%22%3A%22true%22%2C%22CORS_TRUSTED_HOSTS%22%3A%22localhost%2Cexample.com%22%2C%22CORS_TRUSTED_CDN_HOSTS%22%3A%22cdn.example.com%22%7D&project-name=my-modul-ajar-generator&repository-name=my-modul-ajar-generator)

## Manual Deployment

1. [Fork][fork] this repository to your GitHub account.
2. Create a new project on [Vercel][vercel] and connect it to your previously forked repository.
3. During the project configuration on Vercel, ensure you add the required environment variables as specified in the `.env.example` file in this repository.
4. Once the configuration is complete, Vercel will automatically build and deploy your application.
