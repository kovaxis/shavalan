networkEnabled=false;
serverHost="localhost";

running=false;
ticksSinceUpdate=0;
connectedToServer=false;
var tempChanges=[];
updatingPositions=false;
playerCount=1;
var playerKeys=[];
var downKey=-1;
var quitToMenu=false;



width=800;
height=600;
var lavaAnim=0;
var camera={
	x:0,
	y:-height
}
var musicEnabled=true;
var endTickTime=0;
gameStage="loading";
var currentMusic=0;

function resetToMenu() {
	running=false;
	ticksSinceUpdate=0;
	connectedToServer=false;
	tempChanges=[];
	updatingPositions=false;
	playerCount=1;
	playerKeys=[];
	downKey=-1;
	gameStage="menu";
	renderMenu.stage="main";
	characters=[];
	quitToMenu=true;
	currentMusic=0;
}

var lowerColorId;
var bodyColor=0x50;
function lowerColor() {
	bodyColor-=0x01;
	if (bodyColor<=0x00) {
		clearInterval(lowerColorId);
	}
	var hexString=bodyColor.toString(16);
	if (hexString.length<2) hexString="0"+hexString;
	body.bgColor="#"+hexString+hexString+hexString;
}
function keyForPlayer(setto,keyCode) {
	for(var i=0;i<playerKeys.length;i++) {
		var play=playerKeys[i];
		var c=characters[play.id];
		if (play.left==keyCode) {
			c.keysdown.left=setto;
			if (networkEnabled) ticksSinceUpdate=0;
		}else if (play.right==keyCode) {
			c.keysdown.right=setto;
			if (networkEnabled) ticksSinceUpdate=0;
		}else if (play.up==keyCode) {
			c.keysdown.up=setto;
			if (networkEnabled) ticksSinceUpdate=0;
		}
	}
}
function onKeyDown(event) {
	if (gameStage=="playing") {
		if (event.keyCode==13 && !networkEnabled) {
			gameKeysdown.enter=true;
		}else if(event.keyCode==27) {
			stopGame();
		}else if(event.keyCode==downKey) {
			gameKeysdown.NOTLOGIC_lookDown=true;
		}else if(!event.repeat) keyForPlayer(true,event.keyCode);
	}else if(gameStage=="menu") {
		if (renderMenu.stage=="multilocal_setup" || renderMenu.stage=="multinet_setup" && renderMenu.selected!=-1) {
			if (renderMenu.selected==20) {
				downKey=event.keyCode;
				renderMenu.selected=-1;
				clickSound.start();
				renderMenu();
			}else{
				var player=renderMenu.players[renderMenu.selected];
				if (renderMenu.entered==0) {
					player.left=event.keyCode;
					renderMenu.entered++;
					clickSound.start();
					renderMenu();
				}else if(renderMenu.entered==1) {
					player.up=event.keyCode;
					renderMenu.entered++;
					clickSound.start();
					renderMenu();
				}else{
					player.right=event.keyCode;
					renderMenu.selected=-1;
					renderMenu.entered=0;
					clickSound.start();
					renderMenu();
				}
			}
		}else if(renderMenu.stage=="single_setup" && renderMenu.selected!=-1) {
			var play=playerKeys[0];
			if (renderMenu.selected==1) play.up=event.keyCode;
			else if(renderMenu.selected==2) play.left=event.keyCode;
			else if(renderMenu.selected==3) play.right=event.keyCode;
			else if(renderMenu.selected==4) downKey=event.keyCode;
			renderMenu.selected=-1;
			clickSound.start();
			renderMenu();
		}else if(renderMenu.stage=="multi_network_panel") {
			if (event.keyCode==8) {
				serverHost=serverHost.substring(0,serverHost.length-1);
				clickSound.start();
				renderMenu();
				event.preventDefault();
			}
		}else if(renderMenu.stage=="multi_connecting_to_server" && renderMenu.hasPassword) {
			if (event.keyCode==8) {
				renderMenu.password=renderMenu.password.substring(0,renderMenu.password.length-1)
				clickSound.start();
				renderMenu();
				event.preventDefault();
			}
		}
	}
}
function onKeyPress(event) {
	if (gameStage=="menu") {
		if(renderMenu.stage=="multi_network_panel") {
			if(event.charCode==13) {
				var sh=serverHost;
				if (sh.search(":")==-1) sh+=":8001";
				connectToServer(sh);
				renderMenu.stage="multi_connecting_to_server";
				renderMenu.connectingMessage="Connecting...";
				renderMenu.canQuit=false;
				clickSound.start();
				renderMenu();
			}else{
				var c="";
				c=String.fromCharCode(event.charCode).toLowerCase();
				/*if (event.charCode==190) {
					if (event.shiftKey) c=":";
					else c=".";
				}*/
				if ((c>="a" && c<="z") || (c>="0" && c<="9") || c=="." || c==":") {
					clickSound.start();
					serverHost+=c;
					renderMenu();
				}
			}
		}else if(renderMenu.stage=="multi_connecting_to_server" && renderMenu.hasPassword) {
			if (event.charCode==13) {
				webSocket.send("KEY\\"+renderMenu.password);
				renderMenu.password="";
				renderMenu.hasPassword=false;
				clickSound.start();
				renderMenu();
			}else{
				renderMenu.password+=String.fromCharCode(event.charCode);
				clickSound.start();
				renderMenu();
			}
		}
	}
}
function onKeyUp(event) {
	if (gameStage=="playing") {
		if (event.keyCode==13 && !networkEnabled) {
			gameKeysdown.enter=false;
		}else if(event.keyCode==downKey) {
			gameKeysdown.NOTLOGIC_lookDown=false;
		}else keyForPlayer(false,event.keyCode);
	}
}
function touchStart(event) {
		var viewWidth=window.innerWidth;
		var viewHeight=window.innerHeight;
		if (viewWidth==undefined) viewWidth=width;
		if (viewHeight==undefined) viewHeight=height;
		var x=event.changedTouches[0].pageX;
		var y=event.changedTouches[0].pageY;
	if (gameStage=="playing") {
		if (y<viewHeight/2) {	//Jump
			characters[playerKeys[0].id].keysdown.up=true;
			if (networkEnabled) ticksSinceUpdate=0;
		}else{
			if (x<viewWidth/2) {
				characters[playerKeys[0].id].keysdown.left=true;
				if (networkEnabled) ticksSinceUpdate=0;
			}else{
				characters[playerKeys[0].id].keysdown.right=true;
				if (networkEnabled) ticksSinceUpdate=0;
			}
		}
		event.preventDefault();
	}else if(gameStage=="menu" && renderMenu.stage=="multi_network_panel") {
		if (y>=300 && y<=400) {
			//alert("PROMPTING");
			serverHost=prompt("Server IP:","192.168.0.107");
			renderMenu();
		}
	}
}
function touchEnd(event) {
	if (gameStage=="playing") {
		var viewWidth=window.innerWidth;
		var viewHeight=window.innerHeight;
		if (viewWidth==undefined) viewWidth=width;
		if (viewHeight==undefined) viewHeight=height;
		var x=event.changedTouches[0].pageX;
		var y=event.changedTouches[0].pageY;
		if (y<viewHeight/2) {	//Jump
			characters[playerKeys[0].id].keysdown.up=false;
			if (networkEnabled) ticksSinceUpdate=0;
		}else{
			if (x<viewWidth/2) {
				characters[playerKeys[0].id].keysdown.left=false;
				if (networkEnabled) ticksSinceUpdate=0;
			}else{
				characters[playerKeys[0].id].keysdown.right=false;
				if (networkEnabled) ticksSinceUpdate=0;
			}
		}
	}
}
function externalMessage(event) {
	if (event.data[0]=="keydown") {
		onKeyDown({keyCode:event.data[1]});
	}else if(event.data[0]=="keyup") {
		onKeyUp({keyCode:event.data[1]});
	}else if(event.data[0]=="keypress") {
		onKeyPress({keyCode:event.data[1]});
	}
}
function getStringRepresentation(charCode) {
	//Code borrowed from http://www.cambiaresearch.com/
	if(charCode==-1) return "";	//invalid
	else if (charCode == 8) return "backspace"; //  backspace
	else if (charCode == 9) return "tab"; //  tab
	else if (charCode == 13) return "enter"; //  enter
	else if (charCode == 16) return "shift"; //  shift
	else if (charCode == 17) return "ctrl"; //  ctrl
	else if (charCode == 18) return "alt"; //  alt
	else if (charCode == 19) return "pause/break"; //  pause/break
	else if (charCode == 20) return "caps lock"; //  caps lock
	else if (charCode == 27) return "escape"; //  escape
	else if (charCode == 32) return "space"; //  spacebar
	else if (charCode == 33) return "pageup"; // page up, to avoid displaying alternate character and confusing people	         
	else if (charCode == 34) return "pagedown"; // page down
	else if (charCode == 35) return "end"; // end
	else if (charCode == 36) return "home"; // home
	else if (charCode == 37) return "left"; // left arrow
	else if (charCode == 38) return "up"; // up arrow
	else if (charCode == 39) return "right"; // right arrow
	else if (charCode == 40) return "down"; // down arrow
	else if (charCode == 45) return "insert"; // insert
	else if (charCode == 46) return "delete"; // delete
	else if (charCode == 91) return "left window"; // left window
	else if (charCode == 92) return "right window"; // right window
	else if (charCode == 93) return "select"; // select key
	else if (charCode == 96) return "numpad 0"; // numpad 0
	else if (charCode == 97) return "numpad 1"; // numpad 1
	else if (charCode == 98) return "numpad 2"; // numpad 2
	else if (charCode == 99) return "numpad 3"; // numpad 3
	else if (charCode == 100) return "numpad 4"; // numpad 4
	else if (charCode == 101) return "numpad 5"; // numpad 5
	else if (charCode == 102) return "numpad 6"; // numpad 6
	else if (charCode == 103) return "numpad 7"; // numpad 7
	else if (charCode == 104) return "numpad 8"; // numpad 8
	else if (charCode == 105) return "numpad 9"; // numpad 9
	else if (charCode == 106) return "multiply"; // multiply
	else if (charCode == 107) return "add"; // add
	else if (charCode == 109) return "subtract"; // subtract
	else if (charCode == 110) return "decimal point"; // decimal point
	else if (charCode == 111) return "divide"; // divide
	else if (charCode == 112) return "F1"; // F1
	else if (charCode == 113) return "F2"; // F2
	else if (charCode == 114) return "F3"; // F3
	else if (charCode == 115) return "F4"; // F4
	else if (charCode == 116) return "F5"; // F5
	else if (charCode == 117) return "F6"; // F6
	else if (charCode == 118) return "F7"; // F7
	else if (charCode == 119) return "F8"; // F8
	else if (charCode == 120) return "F9"; // F9
	else if (charCode == 121) return "F10"; // F10
	else if (charCode == 122) return "F11"; // F11
	else if (charCode == 123) return "F12"; // F12
	else if (charCode == 144) return "num lock"; // num lock
	else if (charCode == 145) return "scroll lock"; // scroll lock
	else if (charCode == 186) return ";"; // semi-colon
	else if (charCode == 187) return "="; // equal-sign
	else if (charCode == 188) return ","; // comma
	else if (charCode == 189) return "-"; // dash
	else if (charCode == 190) return "."; // period
	else if (charCode == 191) return "/"; // forward slash
	else if (charCode == 192) return "`"; // grave accent
	else if (charCode == 219) return "["; // open bracket
	else if (charCode == 220) return "\\"; // back slash
	else if (charCode == 221) return "]"; // close bracket
	else if (charCode == 222) return "'"; // single quote
	else return String.fromCharCode(charCode);
}
function renderMenu() {
	draw.fillStyle="#FFFFFF";
	draw.fillRect(0,0,width,height);
	if (renderMenu.stage=="main") {
		draw.font="120px Arial";
		draw.fillStyle="#000000";
		var shuffleX=0;
		draw.fillText("SHAVALAN",100,150);
		draw.font="80px Arial";
		draw.fillStyle="#402020";
		draw.fillText("Singleplayer",100+renderMenu.isSelected(1),300);
		draw.fillText("Multiplayer",100+renderMenu.isSelected(2),400);
	}else if(renderMenu.stage=="multinet_setup") {
		draw.fillStyle="#000000";
		draw.font="30px Arial";
		draw.fillText("Back",10,40);
		draw.font="60px Arial";
		draw.strokeStyle="#000000";
		var i=0;
		for(;i<renderMenu.players.length;i++) {
			var player=renderMenu.players[i];
			draw.fillText("Player "+(i+1)+" "+getStringRepresentation(player.left)+" "+getStringRepresentation(player.up)+" "+getStringRepresentation(player.right),50,100+i*80);
			if (i==renderMenu.selected) {
				draw.lineWidth=4;
				draw.strokeRect(50,50+i*80,550,70);
			}
		}
		if (renderMenu.players.length<6) {
			draw.fillText("+",50,100+i*80);
		}
		if (renderMenu.players.length>1) {
			draw.fillText("-",200,100+i*80);
			draw.strokeStyle="#A00000";
			draw.font="30px Arial";
			draw.lineWidth=4;
			draw.strokeRect(184,7,11,30);
			draw.fillStyle="#700000";
			draw.fillText("!",185,33);
			draw.font="15px Arial"
			draw.fillText("Most keyboards can't handle more than 2 players",200,20);
			draw.fillText("Consider connecting another keyboard",200,35);
		}else{
			draw.font="40px Arial";
			draw.fillText("Look Down: "+getStringRepresentation(downKey),50,450);
			if (renderMenu.selected==20) {
				draw.lineWidth=2;
				draw.strokeRect(40,410,560,50);
			}
		}
		draw.fillStyle="#00E000";
		draw.fillRect(620,450,150,80);
		draw.font="60px Arial";
		draw.fillStyle="#FFFFFF";
		draw.fillText("Start",630,510);
		draw.font="40px Arial";
	}else if(renderMenu.stage=="single_setup") {
		draw.fillStyle="#000000";
		draw.font="40px Arial";
		draw.fillText("Back",50,50);
		draw.strokeStyle="#000000";
		draw.lineWidth=4;
		var play=playerKeys[0];
		draw.fillText("Go Left: "+getStringRepresentation(play.left),50,350);
		if (renderMenu.selected==2) draw.strokeRect(45,310,355,50);
		draw.textAlign="end";
		draw.fillText("Go right: "+getStringRepresentation(play.right),750,350);
		if (renderMenu.selected==3) draw.strokeRect(400,310,355,50);
		draw.textAlign="center";
		draw.fillText("Jump: "+getStringRepresentation(play.up),400,250);
		if (renderMenu.selected==1) draw.strokeRect(45,210,705,50);
		draw.fillText("Look Down: "+getStringRepresentation(downKey),400,450);
		if (renderMenu.selected==4) draw.strokeRect(45,410,705,50);
		draw.textAlign="start";
		draw.fillStyle="#00E000";
		draw.fillRect(620,450,150,80);
		draw.font="60px Arial";
		draw.fillStyle="#FFFFFF";
		draw.fillText("Start",630,510);
		if (difficulty.level==0) draw.fillStyle="#E0E000";
		else if(difficulty.level==-1) draw.fillStyle="#00E000";
		else if(difficulty.level==1) draw.fillStyle="#E00000";
		else if(difficulty.level==2) draw.fillStyle="#100000";
		draw.fillRect(620,50,150,80);
		draw.fillStyle="#FFFFFF";
		draw.font="40px Arial";
		draw.textAlign="center";
		if (difficulty.level==0) draw.fillText("Normal",695,105);
		else if(difficulty.level==-1) draw.fillText("Easy",695,105);
		else if(difficulty.level==1) draw.fillText("Hard",695,105);
		else if(difficulty.level==2) draw.fillText("Boring",695,105);
		draw.textAlign="start";
	}else if(renderMenu.stage=="multi_local_or_network") {
		draw.fillStyle="#000000";
		draw.font="40px Arial";
		draw.fillText("Back",50,50);
		draw.font="100px Arial";
		draw.fillText("Local Game",50+renderMenu.isSelected(1),250);
		draw.fillText("Network Game",50+renderMenu.isSelected(2),450);
	}else if(renderMenu.stage=="multilocal_setup") {
		draw.fillStyle="#000000";
		draw.font="30px Arial";
		draw.fillText("Back",10,40);
		draw.font="60px Arial";
		var i=0;
		for(;i<renderMenu.players.length;i++) {
			if (i==0) draw.fillStyle="#D0D0D0";
			else draw.fillStyle=charColor(i);
			var player=renderMenu.players[i];
			draw.fillText("Player "+(i+1)+" "+getStringRepresentation(player.left)+" "+getStringRepresentation(player.up)+" "+getStringRepresentation(player.right),50,100+i*80);
			if (i==renderMenu.selected) {
				draw.strokeStyle=draw.fillStyle;
				draw.lineWidth=4;
				draw.strokeRect(50,50+i*80,550,70);
			}
		}
		if (renderMenu.players.length<6) {
			draw.fillStyle=charColor(i);
			draw.fillText("+",50,100+i*80);
		}
		if (renderMenu.players.length>2) {
			draw.fillStyle=charColor(i-1)
			draw.fillText("-",200,100+i*80);
			draw.strokeStyle="#A00000";
			draw.font="30px Arial";
			draw.lineWidth=4;
			draw.strokeRect(184,7,11,30);
			draw.fillStyle="#700000";
			draw.fillText("!",185,33);
			draw.font="15px Arial"
			draw.fillText("Most keyboards can't handle more than 2 players",200,20);
			draw.fillText("Consider connecting another keyboard",200,35);
		}
		if (difficulty.level==0) draw.fillStyle="#E0E000";
		else if(difficulty.level==-1) draw.fillStyle="#00E000";
		else if(difficulty.level==1) draw.fillStyle="#E00000";
		else if(difficulty.level==2) draw.fillStyle="#100000";
		draw.fillRect(620,350,150,80);
		draw.fillStyle="#00E000";
		draw.fillRect(620,450,150,80);
		draw.font="60px Arial";
		draw.fillStyle="#FFFFFF";
		draw.fillText("Start",630,510);
		draw.font="40px Arial";
		draw.textAlign="center";
		if (difficulty.level==0) draw.fillText("Normal",695,405);
		else if(difficulty.level==-1) draw.fillText("Easy",695,405);
		else if(difficulty.level==1) draw.fillText("Hard",695,405);
		else if(difficulty.level==2) draw.fillText("Boring",695,405);
		draw.textAlign="start";
	}else if(renderMenu.stage=="multi_network_panel") {
		draw.fillStyle="#000000";
		draw.font="40px Arial";
		draw.fillText("Back",50,50);
		draw.fillRect(0,300,width,100);
		draw.font="80px Arial";
		draw.textAlign="center";
		draw.fillText("Enter Server Address:",400,250);
		draw.fillStyle="#FFFFFF";
		draw.fillText(serverHost,400,380);
		draw.textAlign="start";
		draw.fillStyle="#00E000";
		draw.fillRect(620,450,150,80);
		draw.font="60px Arial";
		draw.fillStyle="#FFFFFF";
		draw.fillText("Start",630,510);
	}else if(renderMenu.stage=="multi_connecting_to_server") {
		draw.fillStyle="#000000";
		if(renderMenu.canQuit) {
			draw.font="40px Arial";
			draw.fillText("Back",50,50);
		}
		draw.font="20px Arial";
		draw.textAlign="center";
		draw.fillText(renderMenu.connectingMessage,400,340);
		if(renderMenu.hasPassword) {
			draw.fillText("Password:",400,380);
			var pass="";
			for(var i=0;i<renderMenu.password.length;i++) pass=pass+"*";
			draw.fillText(pass,400,400);
		}
		draw.textAlign="start";
	}else if(renderMenu.stage=="multinet_pregame_lobby") {
		draw.fillStyle="#000000";
		draw.font="40px Arial";
		draw.fillText("Back",50,50);
		if (renderMenu.volunteer && !renderMenu.blockMasterExists) draw.fillStyle="#00E000";
		else draw.fillStyle="#E00000";
		draw.fillRect(490,30,280,80);
		if (difficulty.level==0) draw.fillStyle="#E0E000";
		else if(difficulty.level==-1) draw.fillStyle="#00E000";
		else if(difficulty.level==1) draw.fillStyle="#E00000";
		else if(difficulty.level==2) draw.fillStyle="#100000";
		draw.fillRect(490,120,280,80);
		draw.font="60px Arial";
		draw.fillStyle="#FFFFFF";
		draw.fillText("Volunteer",500,90);
		draw.textAlign="center";
		if (difficulty.level==0) draw.fillText("Normal",630,180);
		else if(difficulty.level==-1) draw.fillText("Easy",630,180);
		else if(difficulty.level==1) draw.fillText("Hard",630,180);
		else if(difficulty.level==2) draw.fillText("Boring",630,180);
		draw.textAlign="start";
		draw.font="20px Arial";
		draw.fillStyle="#000000";
		var imAdmin=false;
		var volunteerCount=0;
		for(var i=0;i<renderMenu.players.length;i++) {
			var play=renderMenu.players[i];
			draw.fillText(play.playerCount+" players",50,80+i*30);
			if (play.isAdmin) draw.fillText("ADMIN",280,80+i*30);
			if (play.volunteer) {
				draw.fillText("Volunteer",150,80+i*30);
				volunteerCount++;
			}
			if (play.blockMaster) draw.fillText("BLOCKS",150,80+i*30);
			if (play.isMe) {
				draw.strokeStyle="#000000";
				draw.lineWidth=2;
				draw.strokeRect(40,60+i*30,310,30);
			}
			if (play.isAdmin && play.isMe) imAdmin=true;
			if (play.blockMaster && play.isMe) isBlockMaster=true;
		}
		if (imAdmin) {
			draw.fillStyle="#00E000";
			draw.fillRect(620,450,150,80);
			if (renderMenu.blockMasterExists || volunteerCount==0) draw.fillStyle="#E00000";
			draw.fillRect(560,350,210,80);
			draw.font="60px Arial";
			draw.fillStyle="#FFFFFF";
			draw.fillText("Start",630,510);
			draw.fillText("Shuffle",570,410);
		}
	}
}
renderMenu.selected=0;
renderMenu.stage="main";
renderMenu.isSelected=function(num){if (num==renderMenu.selected) return 50; else return 0;}
renderMenu.Player=function(up,left,right) {
	this.up=up;
	this.left=left;
	this.right=right;
}
function mouse(event,click) {
	var rect=canvas.getBoundingClientRect();
	var x=event.clientX-rect.left;
	var y=event.clientY-rect.top;
	if (gameStage=="menu") {
		if (renderMenu.stage=="main") {
			if (x>=100) {
				if (click) {
					if (y>=220 && y<=300)		{
						playerKeys=[{left:37,up:38,right:39}];
						downKey=40;
						renderMenu.selected=-1;
						renderMenu.stage="single_setup";
						clickSound.start();
					}else if(y>=320 && y<=400)	{
						renderMenu.stage="multi_local_or_network";
						clickSound.start();
					}
				}else{
					if (y>=220 && y<=300)		renderMenu.selected=1;
					else if(y>=320 && y<=400)	renderMenu.selected=2;
					else						renderMenu.selected=0;
				}
			}
		}else if(renderMenu.stage=="multinet_setup" && click) {
			if(x>=10 && y>=10 && y<=40 && x<=100) {	//Back
				renderMenu.players=[];
				renderMenu.selected=-1;
				renderMenu.stage="multi_local_or_network";
				clickSound.start();
			}else if(renderMenu.players.length==1 && y>=390 && y<=450 && x>=50 && x<=600) {	//LOOKDOWN key
				renderMenu.selected=20;
				clickSound.start();
			}else if (x>=50) {
				if (renderMenu.selected==-1) {
					if (x>=620 && y>=450 && y<=530 && x<=770) {	//620,450,150,80	START
						clickSound.start();
						playerCount=renderMenu.players.length;
						playerKeys=[];
						for(var i=0;i<playerCount;i++) {
							var player=renderMenu.players[i];
							playerKeys.push({left:player.left,right:player.right,up:player.up});
						}
						if (playerCount!=1) downKey=-1;
						serverHost="localhost";
						renderMenu.stage="multi_network_panel";
					}else{
						for(var i=0;i<renderMenu.players.length;i++) {
							if (y>=40+i*80 && y<=100+i*80) {
								renderMenu.selected=i;
								renderMenu.entered=0;
								var p=renderMenu.players[i];
								p.left=-1;
								p.right=-1;
								p.up=-1;
								clickSound.start();
								break;
							}
						}
						var pcount=renderMenu.players.length;
						if (y>=40+pcount*80 && y<=100+pcount*80) {
							if (x<100 && renderMenu.players.length<6) {		//+ clicked and enabled
								renderMenu.players.push(new renderMenu.Player(38,37,39));
								clickSound.start();
							}else if(renderMenu.players.length>1 && x>=200 && x<250) {	//- clicked and enabled
								renderMenu.players.pop();
								clickSound.start();
							}
						}
					}
				}
			}
		}else if(renderMenu.stage=="single_setup" && click) {
			if(x>=50 && y>=10 && y<=50 && x<=150) {	//Back
				playerKeys=[];
				downKey=-1;
				renderMenu.stage="main";
				clickSound.start();
			}else if (y>=190 && y<=250) {	//UP key
				renderMenu.selected=1;
				clickSound.start();
			}else if(y>=290 && y<=350) {	//LEFT or RIGHT key
				if (x>400) {
					renderMenu.selected=3;
				}else{
					renderMenu.selected=2;
				}
				clickSound.start();
			}else if(y>=390 && y<=450) {	//LOOKDOWN key
				renderMenu.selected=4;
				clickSound.start();
			}else if (x>=620 && y>=450 && y<=530 && x<=770) {	//START button
				clickSound.start();
				playerCount=1;
				playerKeys[0].id=0;
				initLocalGame();
			}else if(x>=620 && y>=50 && y<=130 && x<=770) {	//Difficulty button
				difficulty.level++;
				if (difficulty.level>2) difficulty.level=-1;
				clickSound.start();
			}
		}else if(renderMenu.stage=="multi_local_or_network"){
			if(x>=50 && y>=10 && y<=50 && x<=150 && click) {	//Back
				renderMenu.stage="main";
				clickSound.start();
			}else if (x>=50) {
				if (click) {
					if (y>170 && y<250)			{
						//										  UP LEFT RIGHT					  W	 A	D
						renderMenu.players=[new renderMenu.Player(38,37,39),new renderMenu.Player(87,65,68)];
						renderMenu.selected=-1;
						renderMenu.stage="multilocal_setup";
						clickSound.start();
					}else if(y>370 && y<450)	{
						renderMenu.players=[new renderMenu.Player(38,37,39)];
						downKey=40;
						renderMenu.selected=-1;
						renderMenu.stage="multinet_setup";
						clickSound.start();
					}
				}else{
					if (y>170 && y<250)			renderMenu.selected=1;
					else if(y>370 && y<450)		renderMenu.selected=2;
					else						renderMenu.selected=-1;
				}
			}
		}else if(renderMenu.stage=="multilocal_setup" && click) {
			if(x>=10 && y>=10 && y<=40 && x<=100) {	//Back
				renderMenu.players=[];
				renderMenu.selected=-1;
				renderMenu.stage="multi_local_or_network";
				clickSound.start();
			}else if (x>=50) {
				if (renderMenu.selected==-1) {
					if (x>=620 && y>=450 && y<=530 && x<=770) {	//620,450,150,80	START
						clickSound.start();
						playerCount=renderMenu.players.length;
						for(var i=0;i<playerCount;i++) {
							var player=renderMenu.players[i];
							playerKeys.push({id:i,left:player.left,right:player.right,up:player.up});
						}
						initLocalGame();
					}else if(x>=620 && y>=350 && y<=430 && x<=770) {	//620,350,150,80	DIFFICULTY
						difficulty.level++;
						if (difficulty.level>2) difficulty.level=-1;
						clickSound.start();
					}else{
						for(var i=0;i<renderMenu.players.length;i++) {
							if (y>=40+i*80 && y<=100+i*80) {
								renderMenu.selected=i;
								renderMenu.entered=0;
								var p=renderMenu.players[i];
								p.left=-1;
								p.right=-1;
								p.up=-1;
								clickSound.start();
								break;
							}
						}
						var pcount=renderMenu.players.length;
						if (y>=40+pcount*80 && y<=100+pcount*80) {
							if (x<100 && renderMenu.players.length<6) {		//+ clicked and enabled
								renderMenu.players.push(new renderMenu.Player(38,37,39));
								clickSound.start();
							}else if(renderMenu.players.length>2 && x>=200 && x<250) {	//- clicked and enabled
								renderMenu.players.pop();
								clickSound.start();
							}
						}
					}
				}
			}
		}else if(renderMenu.stage=="multi_network_panel" && click) {
			if(x>=50 && y>=10 && y<=50 && x<=150) {	//Back
				renderMenu.stage="multinet_setup";
				clickSound.start();
			}else if (x>=620 && y>=450 && y<=530 && x<=770) {	//620,450,150,80	START
				var sh=serverHost;
				if (sh.search(":")==-1) sh+=":8001";
				connectToServer(sh);
				renderMenu.stage="multi_connecting_to_server";
				renderMenu.connectingMessage="Connecting...";
				renderMenu.canQuit=false;
				clickSound.start();
				renderMenu();
			}
		}else if(renderMenu.stage=="multi_connecting_to_server" && click) {
			if(renderMenu.canQuit && x>=50 && y>=10 && y<=50 && x<=150) {	//Back
				connectedToServer=false;
				renderMenu.stage="multi_network_panel";
				clickSound.start();
			}
		}else if(renderMenu.stage=="multinet_pregame_lobby" && click) {
			if (x>=50 && y>=10 && y<=50 && x<=150) {	//Back
				connectedToServer=false;
				webSocket.close();
				renderMenu.stage="multi_network_panel";
				clickSound.start();
			}else if(x>=490 && y>=30 && x<=770 && y<=110) {	//490,30,280,80	Volunteer
				renderMenu.volunteer=!renderMenu.volunteer;
				webSocket.send("VTU\\"+btos(renderMenu.volunteer));	//VolunTeer Update
				clickSound.start();
			}else{
				var imAdmin=false;
				for(var i=0;i<renderMenu.players.length;i++) {
					var play=renderMenu.players[i];
					if (play.isAdmin && play.isMe) {
						imAdmin=true;
						break;
					}
				}
				if (imAdmin) {
					if (x>=620 && y>=450 && y<=530 && x<=770) {	//START button
						//	ADMin command: BEGIN
						webSocket.send("ADM\\begin");
						clickSound.start();
					}else if(!renderMenu.blockMasterExists && x>=560 && y>=350 && x<=780 && y<=430) {	//560,350,210,80   SHUFFLE button
						//	ADMin command: SHUFFLE
						webSocket.send("ADM\\shuffle");
						clickSound.start();
					}else if(x>=490 && y>=120 && x<=770 && y<=200) {	//490,120,280,80	DIFFICULTY
						//	ADMin command: DIFFICULTY
						difficulty.level++;
						if (difficulty.level>2) difficulty.level=-1;
						webSocket.send("ADM\\difficulty\\"+(difficulty.level));
						clickSound.start();
					}
				}
			}
		}
		renderMenu();
	}
}
function mouseMove(event) {mouse(event,false);}
function mouseClick(event) {mouse(event,true);}
function musicClick() {
	musicEnabled=!musicEnabled;
	if (musicEnabled) {
		dreamsOfAbove.muted=false;
		lowOrbitDriftMoon.muted=false;
	}else{
		dreamsOfAbove.muted=true;
		lowOrbitDriftMoon.muted=true;
	}
}
function dOAEnded() {
	currentMusic=1;
	console.log("Dreams of Above ended");
}
function initLocalGame() {
	gameStage="playing";
	networkEnabled=false;
	isRemote=false;
	for(var i=0;i<playerCount;i++) {
		new Character();
	}
	character=characters[0];
	dreamsOfAbove.play();
	running=true;
	prepareGame();
	gameLoop();
}
function initNetworkGame() {
	gameStage="playing";
	networkEnabled=true;
	isRemote=true;
	running=true;
	dreamsOfAbove.play();
	gameLoop();
}
function gameLoop() {
	var start=performance.now();
	if (!running) {
		dreamsOfAbove.pause();
		dreamsOfAbove.currentTime=0;
		lowOrbitDriftMoon.pause();
		lowOrbitDriftMoon.currentTime=0;
		currentMusic=0;
		if (quitToMenu) renderMenu();
		return;
	}
	if (currentMusic==1) {
		currentMusic=2;
		lowOrbitDriftMoon.play();
	}
	if (networkEnabled) networkTick();
	tick();
	render();
	endTickTime=performance.now();
	var sleepTime=25-(endTickTime-start);
	if (sleepTime<1) sleepTime=1;	//Give CPU a rest ;)
	setTimeout(gameLoop,sleepTime);
}
function networkInput(packet) {
	var data=packet.data.split("\\");
	if (connectedToServer) {
		if (data[0]=="BGN") {	//BeGiN Message
			for (var i=0;i<data[1];i++) {
				new Character();
			}
			myIDs=[];
			for(var i=2;i<data.length;i++) {
				myIDs.push(data[i]);
				playerKeys[i-2].id=data[i];
			}
			console.log("Began. I'm number "+data[2]);
			initNetworkGame();
		}else if(data[0]=="EXT" && (!isMyId(parseInt(data[1],10)) || stob(data[10])) && !updatingPositions) {	//EXTernal player update
			tempChanges[tempChanges.length]=data;
		}else if(data[0]=="RST") {		//ReSeT
			forceReset=true;
			//console.log("Resetting...");
		}else if(data[0]=="BLK" && !updatingPositions) {	//BLocKs update
			tempChanges[tempChanges.length]=data;
		}else if(data[0]=="PUP" && !updatingPositions) {
			tempChanges[tempChanges.length]=data;
		}else if(data[0]=="LAV") {
			lavaHeight=parseFloat(data[1]);
		}else if(data[0]=="PGU") {	//Pre-Game Update
			renderMenu.blockMasterExists=stob(data[1]);
			renderMenu.players=[];
			difficulty.level=parseInt(data[2]);
			for (var i=3;i<data.length;i++) {
				var play=data[i].split(",");
				renderMenu.players.push({
					isAdmin:stob(play[0]),
					isMe:stob(play[1]),
					volunteer: stob(play[2]) && !renderMenu.blockMasterExists,	//If volunteer and there's no blockMaster
					blockMaster:stob(play[3]),
					playerCount:parseInt(play[4],10)
				});
			}
			renderMenu();
		}else if(data[0]=="VPU") {	//Valid Players Update
			for (var i=1;i<data.length;i++) {
				var valid=stob(data[i]);
				characters[i-1].valid=valid;
				if (!valid) {
					if (characters[i-1].deadTicks==-1) characters[i-1].deadTicks=0;
				}
			}
		}
	}else{
		if(data[0]=="AOK") {	//Connected
			connectedToServer=true;
			renderMenu.players=[];
			renderMenu.hasPassword=false;
			renderMenu.stage="multinet_pregame_lobby";
			renderMenu();
		}else if(data[0]=="PAS") {	//Requires Password
			renderMenu.hasPassword=true;
			renderMenu.password="";
			renderMenu();
		}else if(data[0]=="PBD") {
			renderMenu.hasPassword=true;
			renderMenu.password="";
			renderMenu();
		}
	}
}
/**
StringTOBoolean
**/
function stob(str) {
	if (str==="true") return true;
	else return false;
}
/**
BooleanTOString
**/
function btos(bool) {
	if (bool) return "true";
	else return "false";
}
function connectToServer(ip) {
	isRemote=true;
	ip="ws://"+ip;
	try{
		webSocket=new WebSocket(ip);
	}catch(e) {
		renderMenu.message="Failed to connect";
		renderMenu.canQuit=true;
		renderMenu();
		return;
	}
	webSocket.onopen=function(){
		webSocket.send("CFG\\"+playerKeys.length);
	};
	webSocket.onerror=function(evt){
		if (connectedToServer) {
			alert("Fatal Network Error: "+evt);
			stopGame();
		}
	};
	webSocket.onmessage=networkInput;
	webSocket.onclose=function(evt){
		if (connectedToServer) {
			alert("Server closed");
			stopGame();
		}else{
			renderMenu.connectingMessage="Failed to connect";
			renderMenu.canQuit=true;
			renderMenu();
		}
	}
}
function networkTick() {
	if (ticksSinceUpdate>0) {
		ticksSinceUpdate--;
	}else{
		for (var i=0;i<myIDs.length;i++) {
			var c=characters[myIDs[i]];
			//UPD	+	ID	+	X	+	Y	+	MovX	+	MovY	+	Left	+	Right	+	Up	+	Alive	+	Override
			webSocket.send("UPD\\"+c.charID+"\\"+c.x+"\\"+c.y+"\\"+c.movX+"\\"+c.movY+"\\"													//Position/Movement
				+btos(c.keysdown.left)+"\\"+btos(c.keysdown.right)+"\\"+btos(c.keysdown.up)+"\\"+btos(c.deadTicks==-1)+"\\false");		//Flags
		}
		ticksSinceUpdate=10;
	}
	updatingPositions=true;
	while(tempChanges.length!=0) {
		var data=tempChanges[tempChanges.length-1];
		if (data[0]=="EXT") {
			var c=characters[parseInt(data[1],10)];
			c.x=parseFloat(data[2],10);
			c.y=parseFloat(data[3],10);
			c.movX=parseFloat(data[4],10);
			c.movY=parseFloat(data[5],10);
			c.keysdown.left=stob(data[6]);
			c.keysdown.right=stob(data[7]);
			c.keysdown.up=stob(data[8]);
			if (stob(data[9])) {
				if (c.deadTicks!=-1 && isMyId(c.charID)) {
					character=c;
				}
				c.deadTicks=-1;
			}else if(c.deadTicks==-1) c.deadTicks=0;
		}else if(data[0]=="BLK") {
			for(var i=1;i<data.length;i++) {
				var netblock=data[i].split(",");
				var block=false;
				if (i<=blocks.length) block=blocks[i-1];
				if (block) {
					if (stob(netblock[0]) || block.stationary || stob(netblock[5])) {
						block.x=parseFloat(netblock[1]);
						block.y=parseFloat(netblock[2]);
					}
					block.speed=parseFloat(netblock[3]);
					block.length=parseFloat(netblock[4]);
					block.height=parseFloat(netblock[5]);
					if (!block.stationary && stob(netblock[6])) {	//Stationarize
						block.stationary=true;
						block.preY=block.y;
					}
					block.type=netblock[7];
					block.exists=stob(netblock[8]);
				}else{
					var block=new Block(parseFloat(netblock[1]),parseFloat(netblock[2]),parseFloat(netblock[4]),parseFloat(netblock[5]),parseFloat(netblock[3]),netblock[7]);
					block.stationary=stob(netblock[6]);
					block.exists=stob(netblock[8]);
					block.id=i-1;
					blocks[i-1]=block;
				}
			}
		}else if(data[0]=="PUP") {
			var c=characters[parseInt(data[1])];
			c.powerups=JSON.parse(data[2]);
		}
		tempChanges.pop();
	}
	updatingPositions=false;
}
function lifeChange(c) {
	if (isRemote) {	//IsClient
		if (isMyId(c.charID)) ticksSinceUpdate=0;
		else {	//Character revived																					Override
			webSocket.send("UPD\\"+c.charID+"\\"+c.x+"\\"+c.y+"\\"+c.movX+"\\"+c.movY+"\\false\\false\\false\\true\\true");
		}
	}
}
function blockBanished(block) {
	if (isRemote) {
		//BSH	+	ID
		//Banishes a block (exists=false, all blocks.stationary=false)
		webSocket.send("BSH\\"+block.id);
	}
}
function updatedPowerups(c) {
	if (isRemote && isMyId(c.charID)) {
		//POWerup
		webSocket.send("POW\\"+c.charID+"\\"+JSON.stringify(c.powerups));
	}
}
var resourcesLoaded=0;
function resourceReady() {
	if (resourcesLoaded==-1) return;
	resourcesLoaded++;
	if (resourcesLoaded>=6) {
		resourcesLoaded=-1;
		resetToMenu();
		renderMenu();
		console.log("Resources Loaded");
	}
}
function loadAudio(name) {
	var snd=document.getElementById(name);
	snd.start=snd.play;
	return snd;
}
function onLoaded() {
	canvas=document.getElementById("gameCanvas");
	if (canvas==undefined) {alert("Error loading canvas");return;}
	draw=canvas.getContext("2d");
	if (draw==undefined) {alert("Error loading canvas");return;}
	draw.fillStyle="#FFFFFF";
	draw.fillRect(0,0,width,height);
	draw.font="100px Arial";
	draw.fillStyle="#000000";
	draw.fillText("Shavalan",200,300);
	
	body=document.getElementsByTagName("body")[0];
	lowerColorId=setInterval(lowerColor,25);
	
	window.addEventListener("keydown",onKeyDown);
	window.addEventListener("keyup",onKeyUp);
	window.addEventListener("touchstart",touchStart);
	window.addEventListener("touchend",touchEnd);
	window.addEventListener("keypress",onKeyPress);
	canvas.addEventListener("mousemove",mouseMove);
	canvas.addEventListener("click",mouseClick);
	
	clickSound=loadAudio("clickSound");
	
	dreamsOfAbove=document.getElementById("DreamsOfAbove");
	dreamsOfAbove.addEventListener("ended",dOAEnded);
	lowOrbitDriftMoon=document.getElementById("LowOrbitDriftMOON");
	//LoadedData/CanPlay doesn't seem to work in Chrome
	var musicButton=document.getElementById("musicButton");
	musicButton.addEventListener("click",musicClick);
	musicButton.addEventListener("touchstart",musicClick);
	
	blockImage=new Image();
	blockImage.src="res/block.png";
	blockImage.addEventListener("load",resourceReady);
	reviveImage=new Image();
	reviveImage.src="res/revive.png";
	reviveImage.addEventListener("load",resourceReady);
	superjumpImage=new Image();
	superjumpImage.src="res/jump.png";
	superjumpImage.addEventListener("load",resourceReady);
	doublejumpImage=new Image();
	doublejumpImage.src="res/doublejump.png";
	doublejumpImage.addEventListener("load",resourceReady);
	lowgravityImage=new Image();
	lowgravityImage.src="res/lowgrav.png";
	lowgravityImage.addEventListener("load",resourceReady);
	starfieldImage=new Image();
	starfieldImage.src="res/starfield.png";
	starfieldImage.addEventListener("load",resourceReady);
	
	window.addEventListener("message",externalMessage);
}
/*
networkEnabled=confirm("Do you wish to play multiplayer?");
if (!networkEnabled) {
	while(true) {
		playerCount=parseInt(prompt("How many players?","1"),10);
		if (!isNaN(playerCount)) break;
	}
}
if (networkEnabled) {
	draw.fillStyle="#000000";
	draw.font="20px Arial";
	draw.fillText("Connecting...",350,400);
	while(true) {
		serverHost=prompt("Enter Server IP:","localhost");
		if (serverHost.search(/[^a-z0-9.:]/i)==-1) break;	//Found only legal characters
	}
	if (serverHost.search(":")==-1) serverHost+=":8001";
	connectToServer(serverHost);
}else{
	setTimeout(initLocalGame,500);
}
*/
function stopGame() {
	resetGame();
	dreamsOfAbove.pause();
	dreamsOfAbove.currentTime=0;
	lowOrbitDriftMoon.pause();
	lowOrbitDriftMoon.currentTime=0;
	currentMusic=0;
	console.log("Stopped");
	if (networkEnabled) {	//Stop network
		webSocket.close();
		myIDs=[];
	}
	resetToMenu();
}
function managerReset() {	//Called from logic
	dreamsOfAbove.currentTime=0;
	dreamsOfAbove.play();
	lowOrbitDriftMoon.pause();
	lowOrbitDriftMoon.currentTime=0;
	currentMusic=0;
	if (networkEnabled) character=characters[0];
	else character=characters[0];
}
function randomColor() {
	var r=Math.floor(Math.random()*255);
	var g=Math.floor(Math.random()*255);
	var b=Math.floor(Math.random()*255);
	r=r.toString(16);
	if (r.length<2) r="0"+r;
	g=g.toString(16);
	if (g.length<2) g="0"+g;
	b=b.toString(16);
	if (b.length<2) b="0"+b;
	return "#"+r+g+b;
}
function charColor(i) {
	switch(i) {
	case 0:
		return "#FFFFFF";
	case 1:
		return "#FF0000";
	case 2:
		return "#00FF00";
	case 3:
		return "#0000FF";
	case 4:
		return "#7F7F7F";
	case 5:
		return "#000000";
	case 6:
		return "#FFFF00";
	case 7:
		return "#FF00FF";
	case 8:
		return "#00FFFF";
	case 9:
		return "#301005";
	case 10:
		return "#808000";
	case 11:
		return "#008000";
	default:
		return randomColor();
	}
}
function renderHighQuality() {
	//Move camera to Character
	if(isRemote){	//Network Play
		var aliveCount=0;
		var newY=0;
		for(var i=0;i<myIDs.length;i++) {	//Check for MY players
			var c=characters[myIDs[i]];
			if (c.deadTicks==-1) {
				aliveCount++;
				newY+=c.y-500;
			}
		}
		if (aliveCount==0) {	//If all my players are dead,
			for(var i=0;i<characters.length;i++) {	//Then check for ALL players
				var c=characters[i];
				if (c.deadTicks==-1) {
					aliveCount++;
					newY+=c.y-500;
				}
			}
			if (aliveCount!=0) camera.y=newY/aliveCount;	//If anyone is alive, focus them. If no one is alive, leave the camera alone
		}else{
			camera.y=newY/aliveCount;	//If any of MY players are alive, focus them
		}
		if (gameKeysdown.NOTLOGIC_lookDown) camera.y+=200;
	}else if (characters.length==1) {	//Singleplayer
		camera.y=character.y-500;
		if (gameKeysdown.NOTLOGIC_lookDown) camera.y+=200;
	}else{	//Local multiplayer
		var charCount=0;
		camera.x=0;
		var newY=0;
		for(var i=0;i<characters.length;i++) {
			var c=characters[i];
			if (c.deadTicks==-1) {
				charCount++;
				newY+=c.y-600;
			}
		}
		if (charCount!=0) {
			camera.y=newY/charCount+100;
		}
	}
	
	//Fill Background with sky
	draw.fillStyle="#70C0FF";
	draw.fillRect(0,0,width,height);
	/*draw.fillStyle="rgb("+Math.floor(Math.sin(camera.y/1000)*128+127)+","+Math.floor(Math.sin(camera.y/1000+300)*128+127)+","+Math.floor(Math.sin(camera.y/1000+600)*128+127)+")";
	if (camera.y>-5000) {
		draw.fillStyle="#70C0FF";		//Atmosphere
		draw.fillRect(0,0,width,height);
	}else if(camera.y>-10000) {							//Atmosphere escape
		var magicNumber=-(camera.y+5000) /5000;
		draw.fillStyle="rgb("+
			Math.floor(112-magicNumber*107)+","+Math.floor(192-magicNumber*192)+","+Math.floor(255-magicNumber*244)+")"
		draw.fillRect(0,0,width,height);
	}else{
		if (camera.y>-16000) {
			draw.fillStyle="#050010";
			draw.fillRect(0,0,800,600);
			draw.globalAlpha=-(camera.y+10000) /6000;
		}
		draw.drawImage(starfieldImage,0,0,800,600);
		draw.globalAlpha=1;
	}*/
	//console.log(draw.fillStyle);
	
	//If in range, draw floor
	if (camera.y>-height) {
		draw.fillStyle="#000000";
		draw.fillRect(0,-camera.y,width,height);
	}
	
	//Draw Blocks
	for(var i in blocks) {
		var block=blocks[i];
		if (block.y>camera.y+height) continue;
		if (!block.exists) continue;
		//draw.fillRect(block.x-camera.x,block.y-camera.y,block.length,block.height);
		if (block.NOTLOGIC_drawColor==undefined) {
			block.NOTLOGIC_drawColor=randomColor();
		}
		draw.globalAlpha=1;
		var img;
		if (block.type=="solid") img=blockImage;
		else if(block.type=="revive") img=reviveImage;
		else if(block.type=="superjump") img=superjumpImage;
		else if(block.type=="doublejump") img=doublejumpImage;
		else if(block.type=="lowgravity") img=lowgravityImage;
		draw.drawImage(img,block.x-camera.x,block.y-camera.y,block.length,block.height);
		draw.globalAlpha=0.5;
		draw.fillStyle=block.NOTLOGIC_drawColor;
		draw.fillRect(block.x-camera.x,block.y-camera.y,block.length,block.height);
		//draw.fillRect(block.x-camera.x,block.preY-camera.y,block.length,block.height);
		/*if (!block.exists) {		//DEBUG
			draw.fillStyle="#000000";
			draw.globalAlpha=1;
			draw.fillRect(block.x-camera.x,block.y-camera.y,block.length,block.height/2);
		}
		if (!block.stationary) {
			draw.fillStyle="#FFFFFF";
			draw.globalAlpha=1;
			draw.fillRect(block.x-camera.x,block.y-camera.y+block.height/2,block.length,block.height/2);
		}*/
	}
	draw.globalAlpha=1;
	
	//Draw Characters
	for (var i=0;i<characters.length;i++) {
		var c=characters[i];
		if (c.deadTicks==-1 && c.ticksJumping==-1) {
			var topShiftX=0;
			if (c.keysdown.left) topShiftX=-10;
			else if(c.keysdown.right) topShiftX=10;
			draw.beginPath();
			draw.moveTo(c.x+5-camera.x+topShiftX,c.y-60-camera.y);
			draw.lineTo(c.x+30-5-camera.x+topShiftX,c.y-60-camera.y);
			draw.quadraticCurveTo(c.x + 30-camera.x+topShiftX, c.y-60-camera.y, c.x + 30-camera.x+topShiftX, c.y-55-camera.y);
			draw.lineTo(c.x + 30-camera.x, c.y-5-camera.y);
			draw.quadraticCurveTo(c.x + 30-camera.x, c.y-camera.y, c.x + 30 - 5-camera.x, c.y-camera.y);
			draw.lineTo(c.x + 5-camera.x, c.y-camera.y);
			draw.quadraticCurveTo(c.x-camera.x, c.y-camera.y, c.x-camera.x, c.y-5-camera.y);
			draw.lineTo(c.x-camera.x+topShiftX, c.y-55-camera.y);
			draw.quadraticCurveTo(c.x-camera.x+topShiftX, c.y-60-camera.y, c.x + 5-camera.x+topShiftX, c.y-60-camera.y);
			draw.closePath();
			draw.fillStyle=charColor(c.charID);
			draw.fill();
			draw.strokeStyle="#000000";
			draw.lineWidth=5;
			draw.stroke();
		}else if(c.deadTicks<6){
			var middleShiftLeft;
			var middleShiftRight;
			var halfDistance;
			var fullDistance;
			if(c.deadTicks!=-1) {
				middleShiftLeft=-15;
				middleShiftRight=-middleShiftLeft;
				halfDistance=20;
				fullDistance=40;
			}else{
				middleShiftLeft=4;
				middleShiftRight=4;
				halfDistance=25;
				fullDistance=50;
			}
			draw.beginPath();
			draw.moveTo(c.x+5-camera.x,c.y-camera.y);
			draw.lineTo(c.x+25-camera.x,c.y-camera.y);
			draw.quadraticCurveTo(c.x+30-camera.x,c.y-camera.y,c.x+30-camera.x,c.y-5-camera.y);
			//draw.lineTo(c.x+30+middleShiftRight-camera.x,c.y-halfDistance-camera.y);
			//draw.lineTo(c.x+30-camera.x,c.y-fullDistance+5-camera.y);
			draw.quadraticCurveTo(c.x+30+middleShiftRight-camera.x,c.y-halfDistance-camera.y,c.x+30-camera.x,c.y-fullDistance+5-camera.y);
			draw.quadraticCurveTo(c.x+30-camera.x,c.y-fullDistance-camera.y,c.x+25-camera.x,c.y-fullDistance-camera.y);
			draw.lineTo(c.x+5-camera.x,c.y-fullDistance-camera.y);
			draw.quadraticCurveTo(c.x-camera.x,c.y-fullDistance-camera.y,c.x-camera.x,c.y-fullDistance+5-camera.y);
			//draw.lineTo(c.x+middleShiftLeft-camera.x,c.y-halfDistance-camera.y);
			//draw.lineTo(c.x-camera.x,c.y-5-camera.y);
			draw.quadraticCurveTo(c.x+middleShiftLeft-camera.x,c.y-halfDistance-camera.y,c.x-camera.x,c.y-5-camera.y);
			draw.quadraticCurveTo(c.x-camera.x,c.y-camera.y,c.x+5-camera.x,c.y-camera.y);
			draw.closePath();
			draw.fillStyle=charColor(c.charID);
			draw.fill();
			draw.strokeStyle="#000000";
			draw.lineWidth=5;
			draw.stroke(); 
		}
		
		//And their powerups/score
		if (!c.valid) continue;
		draw.fillStyle=charColor(c.charID);
		draw.fillRect(10,10+30*i,10,20);
		if (isRemote) {
			if (isMyId(c.charID)) {
				draw.strokeStyle="#000000";
				draw.lineWidth=1;
				draw.strokeRect(10,10+30*i,10,20);
			}
		}
		draw.font="10px Arial";
		draw.fillText(Math.floor(c.score/80)+"m",34,20+30*i);
		for(var j=0;j<c.powerups.length;j++) {
			var powerup=c.powerups[j];
			draw.fillStyle=powerup.color;
			draw.beginPath();
			draw.arc(80+30*j,20+30*i,10,(powerup.time/powerup.totalTime*2-0.5)*Math.PI,-0.5*Math.PI);
			draw.lineTo(80+30*j,20+30*i);
			draw.fill();
		}
	}
	
	//Draw lava
	draw.beginPath();
	var newLavaX=-lavaAnim;
	var high=false;
	draw.moveTo(newLavaX,lavaHeight-camera.y);
	while(newLavaX<width) {
		newLavaX+=10;
		if (high) draw.quadraticCurveTo(newLavaX,lavaHeight-camera.y-2,newLavaX,lavaHeight-camera.y);
		else draw.quadraticCurveTo(newLavaX,lavaHeight-camera.y+2,newLavaX,lavaHeight-camera.y);
		if (high) draw.quadraticCurveTo(newLavaX,lavaHeight-camera.y+2,newLavaX+10,lavaHeight-camera.y+2);
		else draw.quadraticCurveTo(newLavaX,lavaHeight-camera.y-2,newLavaX+10,lavaHeight-camera.y-2);
		newLavaX+=10;
		high=!high;
	}
	draw.lineTo(width,300-camera.y);
	draw.lineTo(0,300-camera.y);
	draw.fillStyle="#FF0000";
	draw.globalAlpha=0.4;
	draw.fill();
	draw.globalAlpha=1;
	lavaAnim+=2;
	if (lavaAnim>=40) lavaAnim-=40;
}
function renderLowQuality() {
	//Move camera to Character
	if(isRemote){	//Network Play
		var aliveCount=0;
		var newY=0;
		for(var i=0;i<myIDs.length;i++) {	//Check for MY players
			var c=characters[myIDs[i]];
			if (c.deadTicks==-1) {
				aliveCount++;
				newY+=c.y-500;
			}
		}
		if (aliveCount==0) {	//If all my players are dead,
			for(var i=0;i<characters.length;i++) {	//Then check for ALL players
				var c=characters[i];
				if (c.deadTicks==-1) {
					aliveCount++;
					newY+=c.y-500;
				}
			}
			if (aliveCount!=0) camera.y=newY/aliveCount;	//If anyone is alive, focus them. If no one is alive, leave the camera alone
		}else{
			camera.y=newY/aliveCount;	//If any of MY players are alive, focus them
		}
		if (gameKeysdown.NOTLOGIC_lookDown) camera.y+=200;
	}else if (characters.length==1) {	//Singleplayer
		camera.y=character.y-500;
		if (gameKeysdown.NOTLOGIC_lookDown) camera.y+=200;
	}else{	//Local multiplayer
		var charCount=0;
		camera.x=0;
		var newY=0;
		for(var i=0;i<characters.length;i++) {
			var c=characters[i];
			if (c.deadTicks==-1) {
				charCount++;
				newY+=c.y-600;
			}
		}
		if (charCount!=0) {
			camera.y=newY/charCount+100;
		}
	}
	
	//Draw sky
	draw.fillStyle="#70C0FF";
	draw.fillRect(0,0,width,height);
	/*
	if (camera.y>-5000) {
		draw.fillStyle="#70C0FF";		//Atmosphere
	}else if(camera.y>-10000) {							//Atmosphere escape
		var magicNumber=-(camera.y+5000) /5000;
		draw.fillStyle="rgb("+
			Math.floor(112-magicNumber*107)+","+Math.floor(192-magicNumber*192)+","+Math.floor(255-magicNumber*244)+")"
		draw.fillStyle="#400010";
	}else{
		draw.fillStyle="#050010";
	}
	draw.fillRect(0,0,width,height);*/
	
	//Draw floor, if in range
	if (camera.y>-600) {
		draw.fillStyle="#000000";
		draw.fillRect(0,-camera.y,width,height+camera.y);
	}
	
	//Draw Blocks
	for(var i in blocks) {
		var block=blocks[i];
		if (block.y>camera.y+height || block.y+block.height<camera.y) continue;
		if (!block.exists) continue;
		var img=false;
		if (block.type=="solid") {
			if (!block.NOTLOGIC_drawColor) {
				block.NOTLOGIC_drawColor=randomColor();
			}
			draw.fillStyle=block.NOTLOGIC_drawColor;
			draw.fillRect(block.x-camera.x,block.y-camera.y,block.length,block.height);
		}else if(block.type=="revive") img=reviveImage;
		else if(block.type=="superjump") img=superjumpImage;
		else if(block.type=="doublejump") img=doublejumpImage;
		else if(block.type=="lowgravity") img=lowgravityImage;
		if (img) {
			draw.drawImage(img,block.x-camera.x,block.y-camera.y,block.length,block.height);
		}
	}
	
	//Draw Characters
	for (var i=0;i<characters.length;i++) {
		var c=characters[i];
		if (c.deadTicks==-1 && c.ticksJumping==-1) {
			var topShiftX=0;
			if (c.keysdown.left) topShiftX=-10;
			else if(c.keysdown.right) topShiftX=10;
			draw.beginPath();
			draw.moveTo(c.x-camera.x+topShiftX,c.y-60-camera.y);
			draw.lineTo(c.x+30-camera.x+topShiftX,c.y-60-camera.y);
			draw.lineTo(c.x+30-camera.x,c.y-camera.y);
			draw.lineTo(c.x-camera.x,c.y-camera.y);
			draw.lineTo(c.x-camera.x+topShiftX, c.y-60-camera.y);
			draw.closePath();
			draw.fillStyle=charColor(c.charID);
			draw.fill();
			draw.strokeStyle="#000000";
			draw.lineWidth=5;
			draw.stroke();
		}else if(c.deadTicks<6){
			var middleShiftLeft;
			var middleShiftRight;
			var halfDistance;
			var fullDistance;
			if(c.deadTicks!=-1) {
				middleShiftLeft=-15;
				middleShiftRight=-middleShiftLeft;
				halfDistance=20;
				fullDistance=40;
			}else{
				middleShiftLeft=4;
				middleShiftRight=4;
				halfDistance=25;
				fullDistance=50;
			}
			draw.beginPath();
			draw.moveTo(c.x-camera.x,c.y-camera.y);
			draw.lineTo(c.x+30-camera.x,c.y-camera.y);
			draw.lineTo(c.x+30+middleShiftRight-camera.x,c.y-halfDistance-camera.y);
			draw.lineTo(c.x+30-camera.x,c.y-fullDistance-camera.y);
			draw.lineTo(c.x-camera.x,c.y-fullDistance-camera.y);
			draw.lineTo(c.x+middleShiftLeft-camera.x,c.y-halfDistance-camera.y);
			draw.lineTo(c.x-camera.x,c.y-camera.y);
			draw.closePath();
			draw.fillStyle=charColor(c.charID);
			draw.fill();
			draw.strokeStyle="#000000";
			draw.lineWidth=5;
			draw.stroke(); 
		}
		
		//And their powerups/score
		if (!c.valid) continue;
		draw.fillStyle=charColor(c.charID);
		draw.fillRect(10,10+30*i,10,20);
		if (isRemote) {
			if (isMyId(c.charID)) {
				draw.strokeStyle="#000000";
				draw.lineWidth=1;
				draw.strokeRect(10,10+30*i,10,20);
			}
		}
		draw.font="10px Arial";
		draw.fillText(Math.floor(c.score/80)+"m",34,20+30*i);
		for(var j=0;j<c.powerups.length;j++) {
			var powerup=c.powerups[j];
			draw.fillStyle=powerup.color;
			draw.beginPath();
			draw.arc(80+30*j,20+30*i,10,(powerup.time/powerup.totalTime*2-0.5)*Math.PI,-0.5*Math.PI);
			draw.lineTo(80+30*j,20+30*i);
			draw.fill();
		}
	}
	
	//Draw lava if in range
	if (camera.y+height>lavaHeight) {
		draw.globalAlpha=0.5;
		draw.fillStyle="#FF0000";
		draw.fillRect(0,lavaHeight-camera.y,width,height);
		draw.globalAlpha=1;
	}
}
render=renderHighQuality;
//render=renderLowQuality;