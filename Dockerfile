FROM node:10
WORKDIR /home/node/app
RUN npm i -g supervisor
RUN npm i -g cross-env
RUN ln -snf /usr/share/zoneinfo/Europe/Moscow /etc/localtime
RUN echo 'Europe/Moscow' /etc/timezone
