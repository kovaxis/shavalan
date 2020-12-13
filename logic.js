function Character() {
	this.keysdown={
		up:false,
		wasUpPressed:false,
		down:false,
		left:false,
		right:false,
		space:false,
		enter:false
	};
	this.powerups=[];
	this.charID=characters.length;
	characters[this.charID]=this;
};
Character.prototype={
	x:400,
	y:0,
	movX:0,
	movY:0,
	onGround:false,
	onWall: false,
	deadTicks: -1,
	kill:function(){
		if ((!isServer && !isRemote) || isMyId(this.charID)) {
			if (this.deadTicks==-1) {
				this.deadTicks=0;
				if (isRemote) lifeChange(this);
			}
		}
	},
	ticksJumping: -1,
	jumpDirection: 0,
	jump:function(){if (this.ticksJumping==-1)this.ticksJumping=0;},
	wasOnGround:false,	//DoubleJump stuff
	valid:true,	//If player deleted, false
	score: 0	//Height Score
};
function Powerup(type,expire) {
	this.type=type;
	if (type=="superjump") {
		this.color="#FFA500";
	}else if(type=="doublejump") {
		this.color="#0000D0";
	}else if(type=="lowgravity") {
		this.color="#200020";
	}else{
		this.color="#FFFFFF";
	}
	this.time=0;
	if (expire==undefined) {
		if (type=="superjump") {
			this.totalTime=600;	//15 sec
		}else if(type=="doublejump") {
			this.totalTime=800;	//20 sec
		}else if(type=="lowgravity") {
			this.totalTime=400;	//10 sec
		}else{
			this.totalTime=40;	//1 sec
		}
	}else{
		this.totalTime=expire;
	}
}
function Block(x,y,length,height,speed,type) {
	this.x=x;
	this.y=y;
	this.length=length;
	this.height=height;
	this.speed=speed;
	this.stationary=false;
	this.preY=y;
	this.type=type;
	this.exists=true;
	this.banish=function() {
		//if (!this.exists) return;
		this.exists=false;
		for(var i=0;i<blocks.length;i++) {
			blocks[i].stationary=false;
		}
		blockBanished(this);	//Manager Hook
	}
	this.id=-1;
}
var blocks=[];
var topBlock;
var blocksToPowerup=20;
var blocksToRevive=16;
var lavaHeight=300;
var blocksHeight=0;
var lastBlock=1000;
var characters=[];
var gameKeysdown={
	enter:false
};
difficulty={level:0};	//0 is normal, negative for easy, positive for hard
isRemote=false;			//If remote, should only emulate character moves and not blocks and reset
isBlockMaster=false;	//If block master, doesn't own a character, and instead moves camera freely, placing blocks
myIDs=[];				//If remote, the players on my machine
function isMyId(charID) {
	for(var i=0;i<myIDs.length;i++) {
		if (charID==myIDs[i]) return true;
	}
	return false;
}
isServer=false;			//If server, should call manager functions when creating blocks, rising lava, etc...
forceReset=false;		//Force a reset, hook for manager

function resetGame() {
	blocks=[];
	for (var i=0;i<characters.length;i++) {
		var c=characters[i];
		c.x=400;
		c.y=0;
		c.movX=0;
		c.movY=0;
		c.onGround=false;
		c.onWall=false;
		if (c.valid) c.deadTicks=-1;
		else c.deadTicks=100;
		c.powerups=[];
		c.wasOnGround=false;
		c.score=0;
	}
	lavaHeight=300;
	blocksHeight=0;
	topBlock=undefined;
	lastBlock=1000;
	difficulty.setBlocksToPowerup();
	difficulty.setBlocksToRevive();
	managerReset();
	forceReset=false;
}
function addBlocks() {
	if (lastBlock<50) {
		lastBlock++;
	}else{
		var blockCount=1+(Math.floor(Math.random()+0.5));
		var blocksPut=[];
		for (var i=0;i<blockCount;i++) {
			var length=Math.floor(100+Math.random()*100);
			var height=length;
			
			var type="solid";
			if (difficulty.level!=2) {
				blocksToPowerup--;
				blocksToRevive--;
				if (blocksToPowerup<=0){
					/*var list=["superjump","doublejump"];
					if (characters.length>1) list.push("revive");
					var r=Math.random()*list.length;
					for(var j=0;j<list.length;j++) {	//Choose from list
						if (r<j+1) {
							type=list[j];
							break;
						}
					}*/
					var r=Math.random();
					if		(r>0.666666)		type="superjump";
					else if	(r>0.333333)		type="doublejump";
					else						type="lowgravity";
					difficulty.setBlocksToPowerup();
				}else if(blocksToRevive<=0 && characters.length>1) {
					type="revive";
					height=20;
					difficulty.setBlocksToRevive();
				}
			}
			
			//var length=100+Math.floor(Math.random()+0.5)*100;	//Two types, big and small
			var x=0;
			var timesTried=0;
			while(true) {
				x=Math.floor(Math.random()*(width-length));
				var collision=false;
				for(var j=0;j<blocksPut.length;j++) {
					var block=blocksPut[j];
					if (x+length>=block.x && x<=block.x+block.length) {
						collision=true;
						break;
					}
				}
				if (!collision) break;
				timesTried++;
				if (timesTried>100) {
					addBlocks();
					return;
				}
			}
			var speed=Math.floor(7+Math.random()*6);
			if (x>width-length) x=width-length;
			var block=new Block(x,blocksHeight-this.height*2,length,height,speed,type);
			block.id=blocks.length;
			blocksPut[blocksPut.length]=block;
			blocks[blocks.length]=block;
			if (isServer) blockAdded(block);
		}
		lastBlock=0;
	}
}
function addPowerup(c,powerup) {
	for(var i=0;i<c.powerups.length;i++) {
		if (c.powerups[i].type==powerup.type) {
			c.powerups[i].time=0;
			return;
		}
	}
	c.powerups.push(powerup);
	updatedPowerups(c);	//Powerup list change (manager hook)
}
/**
Called when colliding and block is not "solid" type
Side is 0 for TOP
Side is 1 for BOTTOM
Side is 2 for SIDES
Return TRUE for collision, FALSE for walk-through
**/
function powerBlock(c,block,side) {
	if (block.type=="revive") {
		//Activated only when more than one char and LOCAL or REMOTE & char is my char
		if (!block.reviveUsed && side==0 && characters.length>1 && !isServer && (!isRemote || isMyId(c.charID))) {
			console.log("Touched a revive");
			/*var tries=0;
			while(true) {
				var r=Math.floor(Math.random()*characters.length);
				if (r!=c.charID && characters[r].deadTicks!=-1 && characters[r].valid) {
					var teammate=characters[r];
					teammate.deadTicks=-1;
					if (topBlock) {
						teammate.y=topBlock.y;
						teammate.x=topBlock.x+topBlock.length/2-15;
					}else{
						teammate.x=400;
						teammate.y=0;
					}
					teammate.movX=0;
					teammate.movY=0;
					lifeChange(teammate);	//Manager hook
					block.banish();
					break;
				}
				tries++;
				if (tries>100) return true;	//No characters to revive, become solid block
			}*/
			somethingDone=false;
			for (var i=0;i<characters.length;i++) {
				var c=characters[i];
				if (c.deadTicks!=-1 && c.valid) {
					console.log("reviving char...");
					var oldX=c.x;
					var oldY=c.y;
					c.y=block.y;
					var tries=0;
					while(true) {
						c.x=block.x+Math.random()*(block.length+30)-30;
						var colliding=false;
						for(var j=0;j<blocks.length;j++) {
							var b=blocks[j];
							if (b.exists && c.x<=b.x+b.length && c.x+30>=b.x && c.y-60<=b.y+b.height && c.y>b.y) {	//Out of blocks
								colliding=true;
								break;
							}
						}
						if (!colliding) break;
						tries++;
						if(tries>100) {
							console.log("Too many tries");
							block.reviveUsed=true;
							c.x=oldX;
							c.y=oldY;
							return true;
						}
					}
					console.log("Char revived");
					//c.x=block.x+Math.random()*(block.length-30);
					c.deadTicks=-1;
					lifeChange(c);
					somethingDone=true;
				}else console.log("Char "+i+" not able to revive");
			}
			if (somethingDone) {
				block.reviveUsed=true;
			}
		}
		return true;
	}else if(block.type=="superjump") {
		if (!isServer && !isRemote || isMyId(c.charID)) {
			addPowerup(c,new Powerup("superjump"));
			block.banish();
		}
		return false;
	}else if(block.type=="doublejump") {
		if (!isServer && !isRemote || isMyId(c.charID)) {
			addPowerup(c,new Powerup("doublejump"));
			block.banish();
		}
		return false;
	}else if(block.type=="lowgravity") {
		if (!isServer && !isRemote || isMyId(c.charID)) {
			addPowerup(c,new Powerup("lowgravity"));
			block.banish();
		}
	}else{
		return true;
	}
}
function checkWalls(c,preX,preY) {
	c.onWall=false;
	for(var i in blocks) {
		var block=blocks[i];
		if (!block.exists) continue;
		if (c.y>block.y && c.y-60<block.y+block.height) {
			if (c.x<block.x+block.length && preX>=block.x+block.length) {
				if (block.type=="solid" || powerBlock(c,block,2)) {
					c.x=block.x+block.length;
					if (c.keysdown.left) c.onWall=true;
				}
			}else if(c.x+30>block.x && preX+30<=block.x) {
				if (block.type=="solid" || powerBlock(c,block,2)) {
					c.x=block.x-30;
					if (c.keysdown.right) c.onWall=true;
				}
			}
		}
	}
}
function tickCharacter(c) {
	var jumpMultiplier=1;
	var hasDoubleJump=false;
	var hasLowGravity=false;
	var up=false;
	if (c.keysdown.up) {
		if (!c.keysdown.wasUpPressed) {
			up=true;
			c.keysdown.wasUpPressed=true;
		}
	}else{
		c.keysdown.wasUpPressed=false;
	}
	for(var i=0;i<c.powerups.length;i++) {
		var pup=c.powerups[i];
		pup.time++;
		if (pup.time>=pup.totalTime) {	//Powerup end
			c.powerups.splice(i,1);
		}else{
			if (pup.type=="superjump") jumpMultiplier*=1.6;
			else if(pup.type=="doublejump") hasDoubleJump=true;
			else if(pup.type=="lowgravity") {
				hasLowGravity=true;
				jumpMultiplier*=0.85;
			}
		}
	}
	if (!(c.keysdown.left && c.keysdown.right)) {
		if(c.keysdown.left) {
			if (c.movX>-10) {
				var speed=-10-c.movX;
				if (speed<-5) speed=-5;
				else if(speed>0) speed=0;
				c.movX+=speed;
			}
		}else if(c.keysdown.right){
			if (c.movX<10) {
				var speed=10-c.movX;
				if (speed>5) speed=5;
				else if(speed<0) speed=0;
				c.movX+=speed;
			}
		}
	}
	if (c.keysdown.up && c.ticksJumping==-1) {
		c.ticksJumping=0;
		c.keysdown.up=false;
		if (c.onGround) {
			c.jumpDirection=0;
		}else if(c.onWall) {
			if (c.keysdown.left) c.jumpDirection=1;
			else c.jumpDirection=-1;
		}else if(c.wasOnGround && hasDoubleJump) {
			c.jumpDirection=0;
			c.wasOnGround=false;
		}else{
			c.ticksJumping=-1;
			c.keysdown.up=true;
		}
	}
	if (c.ticksJumping>=5) {
		if (c.jumpDirection==0) c.movY=-60*jumpMultiplier;
		else{
			c.movY=-60*jumpMultiplier;
			c.movX=20*c.jumpDirection;
		}
		c.ticksJumping=-1;
	}else if(c.ticksJumping!=-1) {
		c.ticksJumping++;
	}
	if (hasLowGravity) c.movY+=2; else c.movY+=5;
	c.movX*=0.9;
	c.movY*=0.9;
	if (c.onWall && c.movY>0) c.movY*=0.4;
	var preX=c.x;
	var preY=c.y;
	c.x+=c.movX;
	c.y+=c.movY;
	c.onGround=false;
	var shouldX=c.x;
	var shouldY=c.y;
	if (c.y>0) {
		c.y=0;
		c.onGround=true;
		c.movY=0;
	}
	if (preX!=c.x) checkWalls(c,preX,preY);
	var shouldDieOnGround=false;
	for (var i in blocks) {
		var block=blocks[i];
		if (!block.exists) continue;
		if (c.x+30>block.x && c.x<block.x+block.length) {
			if(c.y-60<=block.y+block.height && preY-50>=block.preY+block.height	/*c.y-60<=block.y+block.height && c.y>=block.y+block.height*0.25*/){		//Inside the bottom of a block
				if (block.type=="solid" || powerBlock(c,block,1)) {
					if (c.deadTicks==-1) {
						c.y=block.y+block.height+60;
						if (c.movY<0) c.movY=0;
						shouldDieOnGround=true;
					}
				}
			}
		}
	}
	//	Checking for the floor instead of the roof first because
	//	When a block is supposed to push the player unto the floor, the floor first, would notice nothing,
	//	then the roof would push it under and in the next frame the character would magically be inside a block
	for(var i in blocks) {
		var block=blocks[i];
		if (!block.exists) continue;
		if (c.x+30>block.x && c.x<block.x+block.length) {
			if (c.y>=block.y && preY<=block.y) {		//Block under it
				if (block.type=="solid" || powerBlock(c,block,0)) {
					c.onGround=true;
					c.y=block.y;
					if (block.stationary) {
						c.movY=0;
					}else{
						c.movY=block.speed;
					}
				}
			}
		}
	}
	if (c.onGround) {
		if (shouldDieOnGround) {
			c.kill();
		}
		if ((c.keysdown.left && c.movX>0) || (c.keysdown.right && c.movX<0) || (!c.keysdown.left && !c.keysdown.right)) c.movX*=0.8;
	}
	if (c.onGround || c.onWall) c.wasOnGround=true;
	if (c.x<-30) c.x=width;
	else if(c.x>width) c.x=-30;
	if (c.y>lavaHeight) c.kill();
	if (-c.y>c.score) c.score=-c.y;
}
function tickDeadChar(c) {
	c.deadTicks++;
	return c.deadTicks>5;
}
difficulty.setBlocksToPowerup=function() {
	if (difficulty.level==-1) {
		blocksToPowerup=14;
	}else if(difficulty.level==0) {
		blocksToPowerup=18;
	}else if(difficulty.level==1) {
		blocksToPowerup=26;
	}
}
difficulty.setBlocksToRevive=function() {
	if (difficulty.level==-1) {
		blocksToRevive=16;
	}else if(difficulty.level==0) {
		blocksToRevive=32;
	}else if(difficulty.level==1) {
		blocksToRevive=50;
	}
}
function prepareGame() {
	difficulty.setBlocksToPowerup();
	difficulty.setBlocksToRevive();
}
function tick() {
	if (!isRemote) addBlocks();
	for(var i in blocks) {
		var block=blocks[i];
		if (!block.exists) continue;
		if (!block.stationary) {
			block.preY=block.y;
			block.y+=block.speed;
			if (block.y>=-block.height) {
				block.y=-block.height;
				block.stationary=true;
				block.preY=block.y;
			}else{
				for(var i in blocks) {
					var blockB=blocks[i];
					if (!blockB.exists) continue;
					if (block.y+block.height>blockB.y) {
						if (block.y+block.height<blockB.y+blockB.height) {
							if (block.x<=blockB.x+blockB.length && block.x+block.length>=blockB.x) {
								block.y=blockB.y-block.height;
								if (blockB.stationary) {
									block.stationary=true;
									block.preY=block.y;
									if(block.y<blocksHeight) {
										blocksHeight=block.y;
										topBlock=block;
									}
								}
							}
						}
					}
				}
			}
		}
	}
	var dead=true;
	for(var i=0;i<characters.length;i++) {
		var c=characters[i];
		if (c.deadTicks==-1) {
			tickCharacter(c);
			dead=false;
		}else{
			dead=tickDeadChar(c) && dead;
		}
	}
	if ((!isRemote && (dead || gameKeysdown.enter)) || forceReset) {
		if (gameKeysdown.enter) gameKeysdown.enter=false;
		resetGame();
	}
	if (lavaHeight-100<blocksHeight) {}
	else if (lavaHeight-1000<blocksHeight) lavaHeight-=1;
	else lavaHeight-=2;
}