FROM public.ecr.aws/lambda/nodejs:14

# Assumes your function is named "app.js", and there is a package.json file in the app directory
COPY package* ./

# Install NPM dependencies for function
RUN npm ci

COPY index.js ./
COPY src ./src
COPY .env* ./

# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
CMD [ "index.handler" ]