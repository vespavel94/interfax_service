# Interfax News Aggregator

Данный сервис является агрегатором новостей с ресурса Interfax и интерфейсом для работы с ними другими сервисами с помощью RabbitMQ и ExpressJS Server. Сервис подключается к новостному шлюзу Interfax постредством SOAP API,
обрабатывает полученные данные в соответствии с установленным ТЗ и хранит записи в MongoDB.
Взаимодействие с другими микросервисами осуществляется через RabbitMQ.
Все это деплоится на тестовый и боевой контуры с помощью Docker Compose.

**Обращаю внимание: данный репо опубликован с целью демонстрации кода. Задеплоить этот проект как работоспособный в представленном виде не получится, необходима учетная запись Interfax и конфиги. Допилить его до состояния опенсорс несложно, но не вижу в этом смысла, так как основная задача - показать свой код. Именно поэтому где-то можно встретить Promise.then() вместо async-await**


## Стек

1. **Node**
2. **ExpressJS** as REST Server
3. **RabbitMQ** as Message Broker
4. **MongoDB** as Storage
5. **Docker** as deployment tool
6. **Supervisor** as process Restarter
7. **ESLint** as Code linter


## Как работает сервис:

1. Соединение с Mongo. MongoDB в режиме dev коннектится к локальному инстансу монги на localhost. Режимы test и production подразумевают деплой через docker.
2. Аутентификация учетки Interfax. По понятным причинам логопасс вырезан в данном репо, так как данный репо - демонстрация кода.
3. Запуск кролика. Данные для подключения к каналу аналогично вырезаны из репо. В данном примере кролик - интерфейс для запроса списка новостей другими микросервисами инфраструктуры.
4. После успешных этапов 1-3, сервис запрашивает список новостей за указанный промежуток времени в конфиге (по умолчанию - сутки) и сохраняет в БД, дальше раз в минуту опрашивает Interfax SOAP на наличие новых новостей и выгружает, если они появляются.
5. Поднимается Express HTTP Server. Служит интерфейсом для получения списка новостей по REST.
