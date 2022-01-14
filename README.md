# Chatty

### Api routes

#### Get Rooms list

`http://127.0.0.1/roomlist`

response: `Array`

Example
```js
[{
	"id":"52b0fe8cce5657ea",
	"port":1201,         //debug, non serve al frontend
	"name":"ubuntu",
	"ip":"10.0.0.119"    //debug, non serve al frontend
},{
	"id":"3d36d0469934380f",
	"port":1201,
	"name":"win",
	"ip":"local"
},{
	"id":"cebb581126190379",
	"port":1202,
	"name":"fin-lab",
	"ip":"local"
},{
	"id":"927ee62b85a985c3",
	"port":1201,
	"name":"stanzone",
	"ip":"10.0.0.110"
}]
```

#### Join Room

`http://127.0.0.1/join?id=<room_id>`

response: empty `Object`

Example: `http://127.0.0.1/join?id=52b0fe8cce5657ea`
```
{}
```

#### Create new Room

`http://127.0.0.1/createRoom?name=<room_name>`

response: `Object`

Example: `http://127.0.0.1/createRoom?name=win4`
```js
{
	"id":"63af90767681aa0e2a2d5168c6672346",
	"port":1203,    //debug, non serve al frontend
	"name":"win4",
	"ip":"local"    //debug, non serve al frontend
}
```

## DEV

make key.pem & cert.pem

```sh
openssl genrsa -out key.pem
openssl req -new -key key.pem -out csr.pem -subj "/C=US/ST=Oregon/L=Portland/O=Micidial/OU=Org/CN=www.example.com"
openssl x509 -req -days 365 -in csr.pem -signkey key.pem -out cert.pem
rm csr.pem
```