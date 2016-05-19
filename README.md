# Dist

Example deployment of stairs bot on Heroku or with systemd, with
Flowdock adapter.

Tweak the `package.json` and `index.js` to use and configure the chat
adapter of your choice.

## Environment

For both Heroku and systemd, you need the following environment
variables (example for Flowdock):

| Name           | Value                        |
| -------------- | ---------------------------- |
| DATABASE_URL   | PostgreSQL connection string |
| STAIRS_FLOORS  | Default number of floors     |
| FLOWDOCK_FLOWS | Flows to listen to           |
| FLOWDOCK_TOKEN | Bot user Flowdock token      |

Either set them in the Heroku interface or in the `stairs.service` for
systemd.

## systemd

Modify the `stairs.service.dist` to set the right `WorkingDirectory`
and environment variables (and eventually path to `npm`).

To install it as a user:

```sh
mkdir -p ~/.config/systemd/user
cp stairs.service.dist ~/.config/systemd/user/stairs.service
systemctl --user enable stairs
```

Start it with:

```js
systemctl --user start stairs
```

You can see the logs with:

```js
journalctl --user-unit stairs
```
