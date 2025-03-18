var t=Object.defineProperty,i=(i,s,e)=>((i,s,e)=>s in i?t(i,s,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[s]=e)(i,"symbol"!=typeof s?s+"":s,e);import{p as s}from"./phaser-CwoquCe3.js";!function(){const t=document.createElement("link").relList;if(!(t&&t.supports&&t.supports("modulepreload"))){for(const t of document.querySelectorAll('link[rel="modulepreload"]'))i(t);new MutationObserver((t=>{for(const s of t)if("childList"===s.type)for(const t of s.addedNodes)"LINK"===t.tagName&&"modulepreload"===t.rel&&i(t)})).observe(document,{childList:!0,subtree:!0})}function i(t){if(t.ep)return;t.ep=!0;const i=function(t){const i={};return t.integrity&&(i.integrity=t.integrity),t.referrerPolicy&&(i.referrerPolicy=t.referrerPolicy),"use-credentials"===t.crossOrigin?i.credentials="include":"anonymous"===t.crossOrigin?i.credentials="omit":i.credentials="same-origin",i}(t);fetch(t.href,i)}}();class e extends s.Scene{constructor(){super({key:"MainMenu"})}create(){const t=this.cameras.main.centerX,i=.3*this.cameras.main.height,s=this.add.text(t,i,"CREEPY CRAWLER",{fontFamily:'"Rubik Iso"',fontSize:"64px",color:"#ffffff"});s.setOrigin(.5);const e=this.add.text(t,i+200,"PLAY",{fontFamily:'"Rubik Iso"',fontSize:"48px",color:"#ffffff"});e.setOrigin(.5),e.setInteractive({useHandCursor:!0}),e.on("pointerover",(()=>{e.setScale(1.2),e.setTint(16711680)})),e.on("pointerout",(()=>{e.setScale(1),e.clearTint()})),e.on("pointerdown",(()=>{this.scene.start("Game")})),this.tweens.add({targets:s,y:i-10,duration:1500,yoyo:!0,repeat:-1,ease:"Sine.inOut"})}}class h{constructor(t){i(this,"grid"),i(this,"rooms",[]),i(this,"config"),this.config=t,this.grid=Array(t.gridSize).fill(!1).map((()=>Array(t.gridSize).fill(!0)))}generateLevel(){this.rooms=[],this.grid=Array(this.config.gridSize).fill(!1).map((()=>Array(this.config.gridSize).fill(!0)));const t={x:0,y:0,width:this.config.gridSize,height:this.config.gridSize};this.splitNode(t,0);const{entranceX:i,entranceY:s,exitX:e,exitY:h}=this.placeEntranceAndExit();return{grid:this.grid,entranceX:i,entranceY:s,exitX:e,exitY:h,rooms:this.rooms}}splitNode(t,i){if(i>=this.config.maxSplits)this.createRoom(t);else{if(t.width>t.height){const i=t.x+this.config.minRoomSize,s=t.x+t.width-this.config.minRoomSize,e=Math.floor(i+Math.random()*(s-i));t.left={x:t.x,y:t.y,width:e-t.x,height:t.height},t.right={x:e,y:t.y,width:t.width-(e-t.x),height:t.height}}else{const i=t.y+this.config.minRoomSize,s=t.y+t.height-this.config.minRoomSize,e=Math.floor(i+Math.random()*(s-i));t.left={x:t.x,y:t.y,width:t.width,height:e-t.y},t.right={x:t.x,y:e,width:t.width,height:t.height-(e-t.y)}}this.splitNode(t.left,i+1),this.splitNode(t.right,i+1)}}createRoom(t){const i=this.config.roomPadding,s=t.width-2*i,e=t.height-2*i;if(s<this.config.minRoomSize||e<this.config.minRoomSize)return;const h=Math.min(Math.floor(s+Math.random()*this.config.splitRandomness*s),this.config.maxRoomSize),o=Math.min(Math.floor(e+Math.random()*this.config.splitRandomness*e),this.config.maxRoomSize),r=Math.floor(t.x+i),a=Math.floor(t.y+i),n={x:r,y:a,width:h,height:o};this.rooms.push(n);for(let l=a;l<a+o;l++)for(let t=r;t<r+h;t++)t>=0&&t<this.config.gridSize&&l>=0&&l<this.config.gridSize&&(this.grid[l][t]=!1)}placeEntranceAndExit(){const t=Math.floor(this.config.gridSize/2),i=[...this.rooms].sort((()=>Math.random()-.5));let s=null,e=null;const h=(t,i)=>{const s=t.x+Math.floor(t.width/2),e=t.y+Math.floor(t.height/2),h=i.x+Math.floor(i.width/2),o=i.y+Math.floor(i.height/2);return Math.abs(s-h)+Math.abs(e-o)};for(let l=0;l<i.length;l++){for(let o=l+1;o<i.length;o++)if(h(i[l],i[o])>=t){s=i[l],e=i[o];break}if(s&&e)break}s&&e||(s=i[0],e=i[i.length-1]);const o=s.x+Math.floor(Math.random()*s.width),r=s.y+Math.floor(Math.random()*s.height);let a,n;do{a=e.x+Math.floor(Math.random()*e.width),n=e.y+Math.floor(Math.random()*e.height)}while(this.grid[n][a]);return this.grid[n][a]=!1,{entranceX:o,entranceY:r,exitX:a,exitY:n}}connectRooms(t,i){const s={x:t.x+Math.floor(t.width/2),y:t.y+Math.floor(t.height/2)},e={x:i.x+Math.floor(i.width/2),y:i.y+Math.floor(i.height/2)},h=[],o=new Set,r=new Map,a=t=>`${t.x},${t.y}`,n=(t,i)=>Math.abs(t.x-i.x)+Math.abs(t.y-i.y),l=(t,i)=>this.grid[i][t]?1:3,d=t=>{const i=[],s=[{x:0,y:1},{x:0,y:-1},{x:1,y:0},{x:-1,y:0}];for(const e of s){const s=t.x+e.x,h=t.y+e.y;s>0&&s<this.config.gridSize-1&&h>0&&h<this.config.gridSize-1&&i.push({x:s,y:h})}return i},c={point:s,g:0,h:n(s,e),f:n(s,e)};c.f=c.g+c.h,h.push(c),r.set(a(s),c);let g=0;for(;h.length>0&&g<1e3;){g++;let t=0;for(let e=1;e<h.length;e++)h[e].f<h[t].f&&(t=e);const i=h[t];if(i.point.x===e.x&&i.point.y===e.y){const t=[];let s=i;for(;s;)t.unshift(s.point),s=s.parent;for(const i of t)this.grid[i.y][i.x];return t}h.splice(t,1),o.add(a(i.point));const s=d(i.point);for(const d of s){const t=a(d);if(o.has(t))continue;const s=l(d.x,d.y),c=i.g+s;let g=r.get(t);g?c<g.g&&(g.g=c,g.f=c+g.h,g.parent=i):(g={point:d,g:c,h:n(d,e),f:c+n(d,e),parent:i},h.push(g),r.set(t,g))}}return[]}getGrid(){return this.grid}}class o extends s.Scene{constructor(){super({key:"Game"}),i(this,"grid",[]),i(this,"GRID_SIZE",50),i(this,"CELL_SIZE",32),i(this,"player"),i(this,"playerSprite"),i(this,"PLAYER_SIZE",10),i(this,"PLAYER_SPEED",150),i(this,"targetX",0),i(this,"targetY",0),i(this,"isMoving",!1),i(this,"gridContainer"),i(this,"currentLevel",1),i(this,"levelText"),i(this,"exitX",0),i(this,"exitY",0),i(this,"exitPoint",{x:0,y:0}),i(this,"wallGroup"),i(this,"debugMode",!1),i(this,"debugText"),i(this,"debugGraphics"),i(this,"playerGridMarker"),i(this,"playerVisitedTiles",[]),i(this,"playerBrightLightZone",200),i(this,"playerDimLightZone",400),i(this,"lastPlayerAngle",0),i(this,"graphics"),i(this,"rooms",[]),i(this,"roomTiles",[]),i(this,"roomConnections",new Set),i(this,"paths",new Map),i(this,"wallsToAdd",[]),i(this,"wallsToRemove",[]),i(this,"lastWallUpdate",0),i(this,"WALL_UPDATE_INTERVAL",200),i(this,"levelGenerator"),i(this,"lightingMask"),i(this,"mask")}findSafeSpot(t,i){for(let e=this.playerVisitedTiles.length-1;e>=0;e--){const t=this.playerVisitedTiles[e];if(!this.grid[t.y][t.x])return{x:t.x,y:t.y}}const s=[{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1},{x:1,y:1},{x:-1,y:1},{x:1,y:-1},{x:-1,y:-1}];for(const e of s){const s=t+e.x,h=i+e.y;if(s>=0&&s<this.GRID_SIZE&&h>=0&&h<this.GRID_SIZE&&!this.grid[h][s])return{x:s,y:h}}return null}redrawTile(t,i){this.graphics.clear(),this.graphics.lineStyle(2,16777215),this.wallGroup.clear(!0,!0);for(let s=0;s<this.GRID_SIZE;s++)for(let t=0;t<this.GRID_SIZE;t++)if((this.grid[s][t]||0==t||0==s||t==this.GRID_SIZE-1||s==this.GRID_SIZE-1)&&(s>0&&!this.grid[s-1][t]||s<this.GRID_SIZE-1&&!this.grid[s+1][t]||t>0&&!this.grid[s][t-1]||t<this.GRID_SIZE-1&&!this.grid[s][t+1]||t>0&&s>0&&!this.grid[s-1][t-1]||t<this.GRID_SIZE-1&&s>0&&!this.grid[s-1][t+1]||t>0&&s<this.GRID_SIZE-1&&!this.grid[s+1][t-1]||t<this.GRID_SIZE-1&&s<this.GRID_SIZE-1&&!this.grid[s+1][t+1])){this.drawJaggedTile(t,s);const i=this.physics.add.staticImage(t*this.CELL_SIZE+this.CELL_SIZE/2,s*this.CELL_SIZE+this.CELL_SIZE/2,"__DEFAULT");i.setDisplaySize(this.CELL_SIZE,this.CELL_SIZE),i.setVisible(!1),i.refreshBody(),this.wallGroup.add(i)}}drawJaggedTile(t,i){const s=t*this.CELL_SIZE,e=i*this.CELL_SIZE;this.graphics.beginPath(),this.graphics.moveTo(s+4*Math.random(),e+4*Math.random());for(let h=0;h<4;h++){const t=s+(h+1)*(this.CELL_SIZE/4)+(4*Math.random()-2),i=e+(4*Math.random()-2);this.graphics.lineTo(t,i)}for(let h=0;h<4;h++){const t=s+this.CELL_SIZE+(4*Math.random()-2),i=e+(h+1)*(this.CELL_SIZE/4)+(4*Math.random()-2);this.graphics.lineTo(t,i)}for(let h=3;h>=0;h--){const t=s+h*(this.CELL_SIZE/4)+(4*Math.random()-2),i=e+this.CELL_SIZE+(4*Math.random()-2);this.graphics.lineTo(t,i)}for(let h=3;h>=0;h--){const t=s+(4*Math.random()-2),i=e+h*(this.CELL_SIZE/4)+(4*Math.random()-2);this.graphics.lineTo(t,i)}this.graphics.closePath(),this.graphics.stroke()}getRoomConnectionKey(t,i){const[s,e]=[this.rooms.indexOf(t),this.rooms.indexOf(i)];return`${Math.min(s,e)},${Math.max(s,e)}`}areRoomsConnected(t,i){return this.roomConnections.has(this.getRoomConnectionKey(t,i))}removeAllConnections(){this.wallsToAdd=[],this.wallsToRemove=[];for(const t of this.paths.values())for(const i of t)this.roomTiles[i.y][i.x]||this.wallsToAdd.push(i);this.roomConnections.clear(),this.paths.clear()}connectRooms(t,i){const s=this.levelGenerator.connectRooms(t,i);if(s.length>0){const e=this.getRoomConnectionKey(t,i);this.roomConnections.add(e),this.paths.set(e,s);for(const t of s)this.roomTiles[t.y][t.x]||this.wallsToRemove.push(t)}}processWallChanges(t){if(!(t-this.lastWallUpdate<this.WALL_UPDATE_INTERVAL)){if(this.lastWallUpdate=t,this.wallsToAdd.length>0){const t=this.wallsToAdd.shift();t.x===this.exitPoint.x&&t.y===this.exitPoint.y||(this.grid[t.y][t.x]=!0)}if(this.wallsToRemove.length>0){const t=this.rooms.find((t=>t.x<=this.player.x/this.CELL_SIZE&&t.x+t.width>this.player.x/this.CELL_SIZE&&t.y<=this.player.y/this.CELL_SIZE&&t.y+t.height>this.player.y/this.CELL_SIZE));if(t){const i=this.rooms.indexOf(t),s=Array.from(this.paths.entries()).filter((([t])=>{const[s,e]=t.split(",").map(Number);return s===i||e===i}));if(s.length>0)for(const[t,e]of s){const t=this.wallsToRemove.find((t=>e.some((i=>i.x===t.x&&i.y===t.y))));if(t){const i=t,s=this.wallsToRemove.indexOf(i);s>-1&&this.wallsToRemove.splice(s,1),this.grid[i.y][i.x]=!1;break}}}if(this.wallsToRemove.length>0){const t=this.wallsToRemove.shift();this.grid[t.y][t.x]=!1}}(this.wallsToAdd.length>0||this.wallsToRemove.length>0)&&this.redrawTile(0,0)}}getRoomConnectionCount(t){let i=0;for(const s of this.roomConnections){const[e,h]=s.split(",").map(Number);e!==this.rooms.indexOf(t)&&h!==this.rooms.indexOf(t)||i++}return i}connectUnconnectedRooms(){const t=this.rooms.filter((t=>0===this.getRoomConnectionCount(t)));for(;t.length>0;){const i=this.rooms.find((t=>t.x<=this.exitX&&t.x+t.width>this.exitX&&t.y<=this.exitY&&t.y+t.height>this.exitY)),s=this.rooms.find((t=>t.x<=this.player.x/this.CELL_SIZE&&t.x+t.width>this.player.x/this.CELL_SIZE&&t.y<=this.player.y/this.CELL_SIZE&&t.y+t.height>this.player.y/this.CELL_SIZE));let e;if(s&&0===this.getRoomConnectionCount(s)){e=s;const i=t.findIndex((t=>t===s));-1!==i&&t.splice(i,1)}else if(i&&0===this.getRoomConnectionCount(i)){e=i;const s=t.findIndex((t=>t===i));-1!==s&&t.splice(s,1)}else{const i=Math.floor(Math.random()*t.length);e=t[i],t.splice(i,1)}const h=this.rooms.filter((t=>t!==e&&this.getRoomConnectionCount(t)<2&&!this.areRoomsConnected(e,t)));if(0===h.length)continue;const o=h[Math.floor(Math.random()*h.length)];this.connectRooms(e,o)}}removeSomeConnections(){this.wallsToAdd=[];const t=Array.from(this.paths.entries());if(0===t.length)return;const i=Math.floor(t.length*(.3+.3*Math.random())),s=new Set;for(;s.size<i;){const i=Math.floor(Math.random()*t.length);s.add(t[i][0])}for(const[e,h]of t)if(s.has(e))for(const t of h)this.roomTiles[t.y][t.x]||this.wallsToAdd.push(t);for(const e of s)this.roomConnections.delete(e),this.paths.delete(e)}create(){var t;this.load.image("player_down_idle","assets/sprites/brother_stand_down.png"),this.load.image("player_down_walk1","/assets/sprites/brother_walk_down_1.png"),this.load.image("player_down_walk2","/assets/sprites/brother_walk_down_2.png"),this.load.image("player_left_idle","/assets/sprites/brother_stand_side.png"),this.load.image("player_left_walk1","/assets/sprites/brother_walk_side_1.png"),this.load.image("player_left_walk2","/assets/sprites/brother_walk_side_2.png"),this.load.image("player_up_idle","/assets/sprites/brother_stand_up.png"),this.load.image("player_up_walk1","/assets/sprites/brother_walk_up_1.png"),this.load.image("player_up_walk2","/assets/sprites/brother_walk_up_2.png"),this.load.image("player_death","/assets/sprites/brother_skeleton.png"),this.physics.world.setBounds(0,0,this.GRID_SIZE*this.CELL_SIZE,this.GRID_SIZE*this.CELL_SIZE),this.wallGroup=this.physics.add.staticGroup(),this.lightingMask=this.add.graphics(),this.lightingMask.setDepth(1),this.mask=new Phaser.Display.Masks.BitmapMask(this,this.lightingMask);const i=new h({gridSize:this.GRID_SIZE,minRoomSize:3,maxRoomSize:12,maxSplits:5,roomPadding:1,splitRandomness:.25}),s=i.generateLevel();this.grid=s.grid,this.exitX=s.exitX,this.exitY=s.exitY,this.exitPoint={x:this.exitX,y:this.exitY},this.rooms=s.rooms,this.levelGenerator=i,this.roomTiles=Array(this.GRID_SIZE).fill(!1).map((()=>Array(this.GRID_SIZE).fill(!1)));for(const h of this.rooms)for(let t=h.y;t<h.y+h.height;t++)for(let i=h.x;i<h.x+h.width;i++)this.roomTiles[t][i]=!0;this.graphics=this.add.graphics(),this.graphics.lineStyle(2,16777215),this.gridContainer=this.add.container(0,0);const e=this.add.rectangle(s.entranceX*this.CELL_SIZE+this.CELL_SIZE/2,s.entranceY*this.CELL_SIZE+this.CELL_SIZE/2,.8*this.CELL_SIZE,.8*this.CELL_SIZE,16711680);this.gridContainer.add(e);const o=this.add.rectangle(this.exitX*this.CELL_SIZE+this.CELL_SIZE/2,this.exitY*this.CELL_SIZE+this.CELL_SIZE/2,.8*this.CELL_SIZE,.8*this.CELL_SIZE,65280);this.gridContainer.add(o),this.redrawTile(0,0);const r=s.entranceX*this.CELL_SIZE+this.CELL_SIZE/2,a=s.entranceY*this.CELL_SIZE+this.CELL_SIZE/2,n=this.add.graphics();n.lineStyle(2,16711680),n.fillStyle(16711680),n.beginPath(),n.arc(this.PLAYER_SIZE,this.PLAYER_SIZE,this.PLAYER_SIZE/2,0,2*Math.PI),n.closePath(),n.fill(),n.stroke(),n.generateTexture("player",2*this.PLAYER_SIZE,2*this.PLAYER_SIZE),n.destroy(),this.player=this.physics.add.sprite(r,a,"player"),this.player.setCircle(this.PLAYER_SIZE/2,this.PLAYER_SIZE/2,this.PLAYER_SIZE/2),this.playerSprite=this.add.sprite(r,a,"player_down_idle"),this.playerSprite.setDepth(1),this.physics.add.collider(this.player,this.wallGroup),this.gridContainer.setMask(this.mask),this.graphics.setMask(this.mask),this.player.setMask(this.mask),this.cameras.main.startFollow(this.player),this.cameras.main.setZoom(1),this.levelText=this.add.text(16,16,`Level: ${this.currentLevel}`,{fontSize:"32px",color:"#ffffff",backgroundColor:"#000000",padding:{left:10,right:10,top:5,bottom:5}}),this.levelText.setScrollFactor(0),this.input.on("pointerdown",(t=>{0===t.button&&(this.isMoving=!0,this.updateTargetPosition(t))})),this.input.on("pointermove",(t=>{this.isMoving&&t.isDown&&0===t.button?this.updateTargetPosition(t):this.isMoving=!1})),this.input.on("pointerup",(t=>{0===t.button&&(this.isMoving=!1,this.player.setVelocity(0,0))})),this.game.canvas.addEventListener("mouseout",(()=>{this.isMoving=!1,this.player&&this.player.setVelocity(0,0)})),this.debugGraphics=this.add.graphics(),this.physics.world.createDebugGraphic(),this.physics.world.debugGraphic.setVisible(!1),this.playerGridMarker=this.add.rectangle(0,0,this.CELL_SIZE,this.CELL_SIZE,65280,.3),this.playerGridMarker.setVisible(!1),this.playerGridMarker.setDepth(1),this.debugText=this.add.text(16,60,"Debug Mode: OFF",{fontSize:"24px",color:"#ffffff",backgroundColor:"#000000",padding:{left:10,right:10,top:5,bottom:5}}),this.debugText.setScrollFactor(0),this.debugText.setDepth(1e3),null==(t=this.input.keyboard)||t.on("keydown-T",(()=>{this.debugMode=!this.debugMode,this.physics.world.debugGraphic.setVisible(this.debugMode),this.playerGridMarker.setVisible(this.debugMode),this.debugText.setText("Debug Mode: "+(this.debugMode?"ON":"OFF")),this.debugMode||this.debugGraphics.clear()}))}updateTargetPosition(t){const i=this.cameras.main.getWorldPoint(t.x,t.y);this.targetX=i.x,this.targetY=i.y}checkExitReached(){const t=Math.floor(this.player.x/this.CELL_SIZE),i=Math.floor(this.player.y/this.CELL_SIZE);return t===this.exitX&&i===this.exitY}nextLevel(){this.currentLevel++,this.wallsToAdd=[],this.wallsToRemove=[],this.roomConnections.clear(),this.paths.clear(),this.playerVisitedTiles=[],this.exitX=0,this.exitY=0,this.exitPoint={x:0,y:0},this.wallGroup.clear(!0,!0),this.graphics.clear(),this.debugGraphics.clear(),this.debugMode=!1,this.physics.world.debugGraphic.setVisible(!1),this.playerGridMarker.setVisible(!1),this.debugText.setText("Debug Mode: OFF"),this.isMoving=!1,this.targetX=0,this.targetY=0,this.grid=[],this.rooms=[],this.roomTiles=[],this.scene.restart()}update(t,i){this.processWallChanges(t),this.lightingMask.clear();const s=this.player.body.velocity;let e=0;e=0!==s.x||0!==s.y?Math.atan2(s.y,s.x):this.lastPlayerAngle||0,this.lastPlayerAngle=e;const h=Phaser.Math.RadToDeg(e),o=h-60,r=h+60;this.lightingMask.fillStyle(16777215,.5),this.lightingMask.beginPath(),this.lightingMask.moveTo(this.player.x,this.player.y),this.lightingMask.arc(this.player.x,this.player.y,this.playerBrightLightZone,Phaser.Math.DegToRad(o),Phaser.Math.DegToRad(r)),this.lightingMask.closePath(),this.lightingMask.fill(),this.lightingMask.fillStyle(16777215,.2),this.lightingMask.beginPath(),this.lightingMask.moveTo(this.player.x,this.player.y),this.lightingMask.arc(this.player.x,this.player.y,this.playerDimLightZone,Phaser.Math.DegToRad(o),Phaser.Math.DegToRad(r)),this.lightingMask.closePath(),this.lightingMask.fill();const a=Math.floor(this.player.x/this.CELL_SIZE),n=Math.floor(this.player.y/this.CELL_SIZE);if(this.playerGridMarker.setPosition(a*this.CELL_SIZE+this.CELL_SIZE/2,n*this.CELL_SIZE+this.CELL_SIZE/2),this.grid[n][a]){const t=this.findSafeSpot(a,n);t&&(this.player.setPosition(t.x*this.CELL_SIZE+this.CELL_SIZE/2,t.y*this.CELL_SIZE+this.CELL_SIZE/2),this.isMoving=!1,this.player.setVelocity(0,0))}const l={x:a,y:n},d=this.playerVisitedTiles.findIndex((t=>t.x===l.x&&t.y===l.y));if(-1!==d&&this.playerVisitedTiles.splice(d,1),this.playerVisitedTiles.push(l),this.debugMode&&(this.debugGraphics.clear(),this.debugGraphics.lineStyle(2,65280),this.playerVisitedTiles.forEach(((t,i)=>{const s=.3+i/this.playerVisitedTiles.length*.7;this.debugGraphics.fillStyle(65280,s),this.debugGraphics.fillRect(t.x*this.CELL_SIZE,t.y*this.CELL_SIZE,this.CELL_SIZE,this.CELL_SIZE)}))),this.isMoving&&this.input.activePointer.isDown&&0===this.input.activePointer.button){const t=Phaser.Math.Distance.Between(this.player.x,this.player.y,this.targetX,this.targetY);t<4&&this.updateTargetPosition(this.input.activePointer);const s=Phaser.Math.Angle.Between(this.player.x,this.player.y,this.targetX,this.targetY),e=new Phaser.Math.Vector2;if(e.setToPolar(s,this.PLAYER_SPEED),t<this.PLAYER_SPEED*(i/1e3)){const s=t/(this.PLAYER_SPEED*(i/1e3));e.scale(s)}this.player.setVelocity(e.x,e.y),this.playerSprite.setPosition(this.player.x,this.player.y)}else this.input.activePointer.isDown&&0===this.input.activePointer.button||(this.isMoving=!1,this.player.setVelocity(0,0),this.playerSprite.setPosition(this.player.x,this.player.y));this.checkExitReached()&&this.nextLevel(),0===this.wallsToAdd.length&&this.wallsToRemove.length<50&&this.removeSomeConnections(),0===this.wallsToRemove.length&&this.connectUnconnectedRooms()}}const r={type:Phaser.AUTO,width:1024,height:768,parent:"game-container",backgroundColor:"#000000",antialias:!1,pixelArt:!0,physics:{default:"arcade",arcade:{gravity:{x:0,y:0},debug:!1}},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[e,o]};new s.Game(r);
