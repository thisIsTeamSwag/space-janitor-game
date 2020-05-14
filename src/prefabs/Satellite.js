//check the strata values again , compare them with the orbital rotation.
class Satellite extends Phaser.Physics.Arcade.Sprite {
    constructor(
        scene, x_pos, y_pos, scale, texture, frame
        ) {
        super(scene, x_pos, y_pos, texture, frame);

        scene.add.existing(this);               // add to existing scene, displayList, updateList
        scene.physics.add.existing(this);

        //update this on star hitting satellite in scene
        this.setDepth(6);

        this.satelliteBody = this.body;

        this.setScale(scale);

        this.Scale = scale;
        this.radius = 75;
        this.radiusWeighted = 75 * this.Scale;
        this.setCircle(this.radius, 0, 0);

        this.orbitalRadiusWeighted = this.radius * this.Scale;

        //Orbital
        this.orbital = this.scene.physics.add.sprite(
            this.x, this.y, "Orbital"
        );
        
        this.orbitalBody = this.orbital.body;
        this.orbitalRadius = 150;

        this.orbital.setImmovable(true);
        this.orbital.setDepth(2);
        //we offset the radius by star.radius in order to not let the star ride
        //the outer edge of the orbital
        this.orbital.setCircle(
            this.orbitalRadius - this.scene.star.radius/6, 
            this.scene.star.radius/6, this.scene.star.radius/6);
        this.orbital.setScale(scale);

        this.orbitalRadiusWeighted = this.orbitalRadius * this.Scale;

        this.orbitalAccelModDefault = 0.065;
        this.orbitalAccelModScaling = 1 + 0.0005 * this.scene.star.speedMod;
        this.orbitalAccelMod = this.orbitalAccelModDefault;
        this.orbitalEntered = false;
        this.canStopOrbiting = false;
        this.distToStar;
        this.lastDistToStar; //need to have this reset on orbit leave
        this.clockRotation = 1;
        this.isOrbitingSmoothly = false;
        this.canReEnterOrbit = false;
        this.isPreOrbiting = false;
        this.currRotationDuration = 0;
        this.isPreOrbitingStar = false;
        this.isOrbitingStar = false;
        this.isCollidable = true;
        this.angleToStar;
        this.speedMod;
        this.isAttachedToStar = false;
        
        this.x_velocity = 0;
        this.y_velocity = 0;

        this.trajectory = 0;
        this.lastTrajectory = 0;

        this.isLargerThanStar = this.scene.star.Scale <= this.Scale ? true : false;

        this.scatterAngle = Math.random() * 2 * Math.PI;
        this.maxScatterDist = 200;
        this.isScattering = false;
        this.timeSpentScattering = 1;

        //mimic starSizeChanged()
        if (!this.isLargerThanStar) 
        {
            this.orbitalBody.setEnable(false);
            this.orbital.setVisible(false);
        }
        else 
        {
            this.orbitalBody.setEnable(true);
            this.orbital.setVisible(true);
        }

        this.scene.physics.add.overlap(this.scene.star, this.orbital, this.orbitalEntry, null, this);
        this.scene.physics.add.overlap(this.scene.star, this, this.handleStarCollision, null, this);

    }

    update() {

        //Properties

        this.orbitalRotation();

        this.stickToStar();

        this.scatter();
    }

    preScatter() {
        this.scatterTargetX = this.x + this.maxScatterDist * Math.cos(this.scatterAngle);
        this.scatterTargetY = this.y + this.maxScatterDist * Math.sin(this.scatterAngle);
        
        this.velToScatterTargetX = (this.scatterTargetX - this.x);
        this.velToScatterTargetY = (this.scatterTargetY - this.y);

        this.isScattering = true;

    }

    scatter() {
        if (this.isScattering)
        {
            this.setVelocity(this.velToScatterTargetX, this.velToScatterTargetY);

            if (this.timeSpentScattering < 180) {
                this.velToScatterTargetX -= this.velToScatterTargetX / 60;
                this.velToScatterTargetY -= this.velToScatterTargetY / 60;
                this.timeSpentScattering++;
            }
            else
            {
                    console.log("finished");
                    this.setVelocity(0,0);
                    this.timeSpentScattering = 0;
                    this.isScattering = false;
                    this.isCollidable = true;
                    this.isAttachedToStar = false;
                    this.updateOrbital();
                    
                
            }

        }   

    }

    handleStarCollision() {
        if (this.isCollidable) 
        {
            if (this.isLargerThanStar) 
            {
                console.log("collided with larger");
                //turn this back on when bounce has completed
                this.isCollidable = false;
                this.scene.star.shrinkUpdate();
            }
            else 
            {
                console.log("collided with smaller");
                //this will be the strata that the satellite rotates on
                this.distToStar = Math.sqrt(
                    (this.x - this.scene.star.x) * (this.x - this.scene.star.x)
                    +
                    (this.y - this.scene.star.y) * (this.y - this.scene.star.y)
                );

                this.angleToStar = Math.atan(
                    (this.scene.star.y - this.y)
                    /
                    (this.scene.star.x - this.x)
                );
                if (this.scene.star.x - this.x >= 0) this.angleToStar += Math.PI;

                this.isCollidable = false;
                this.scene.star.growUpdate(this, this.Scale);
                this.isAttachedToStar = true;
            }
            //notify other satellites
            this.scene.updateSatellites();
        }
    }

    stickToStar() {
        //constantly update placement based on angle
        if (this.isAttachedToStar) 
        {
            console.log("sticking to star");

            if(this.scene.star.trajectory != this.scene.star.lastTrajectory) 
             {
                let angleChange = this.scene.star.trajectory - this.scene.star.lastTrajectory;
                this.angleToStar += angleChange;
                this.rotation = this.scene.star.rotation;

                let moveToThisX = this.scene.star.x + this.distToStar * Math.cos(this.angleToStar);
                let moveToThisY = this.scene.star.y + this.distToStar * Math.sin(this.angleToStar);

                this.x = moveToThisX;
                this.y = moveToThisY;
            }   
        this.setVelocity(this.scene.star.x_velocity, this.scene.star.y_velocity);
        }
    }
    

    findTrajectory() {
        if (this.x_velocity != 0)
        {
            this.lastTrajectory = this.trajectory;
            this.trajectory = Math.atan(
                (this.y_velocity)
                /
                (this.x_velocity)
            );
            if (this.x_velocity >= 0) this.trajectory += Math.PI;
        }

        // console.log((this.trajectory * 180 / Math.PI));
    }

    normalize(x, y, mod) {
        if (x * y != 0) 
        {  
            let length = Math.sqrt(
                (x * x)
                +
                (y * y)
            );  

            let normX = x / length;
            let normY = y / length;

            let results = [normX * mod, normY * mod];
            return results;
        }
        return 0;
    }
    //called from level.js when star changes 
    updateOrbital()
    {
        this.isLargerThanStar = this.scene.star.Scale <= this.Scale ? true : false;

        if (this.isLargerThanStar) 
        {
            console.log(this.Scale);
            console.log("is larger");
            this.orbitalBody.setEnable(true);
            this.orbital.setVisible(true);
        }
        else 
        {
            console.log("is smaller");
            this.orbitalBody.setEnable(false);
            this.orbital.setVisible(false);
        }
    }

    orbitalEntry() {
        // to make sure this runs once
        if (this.isLargerThanStar && !this.orbitalEntered) 
        {
            //this was in update(), as well as the one in orbitalrotation. if it breaks, undo it
            this.distToStar = Math.sqrt(
                (this.x - this.scene.star.x) * (this.x - this.scene.star.x)
                +
                (this.y - this.scene.star.y) * (this.y - this.scene.star.y)
            );

            console.log("orbitalentry");
            this.findClockRotation();
            this.isPreOrbiting = true;
            this.orbitalBody.setEnable(false);
            this.orbitalEntered = true;
            this.lastDistToStar = this.distToStar;
            this.canReEnterOrbit = true;
        }
    }

    orbitalRotation() {
        if //distance btwn star and satellite < orbital_radius
        ( this.canReEnterOrbit && keySPACE.isDown && this.distToStar - 0.5*this.scene.star.radiusWeighted <= this.orbitalRadiusWeighted) 
        { 
            this.distToStar = Math.sqrt(
                (this.x - this.scene.star.x) * (this.x - this.scene.star.x)
                +
                (this.y - this.scene.star.y) * (this.y - this.scene.star.y)
            );
            //The currRotationDuration check is required for smooth orbitting, since the acceleration to
            //  lastDistStar makes going backwards really jumpy
            this.lastDistToStar = 
                this.lastDistToStar <= this.distToStar && this.currRotationDuration > 90 ? 
                this.lastDistToStar : this.distToStar;

            this.currRotationDuration ++;
            //accelerate towards next point on parametric equation on circumference
            // next point is taken every frame, based on the current distToStar as radius
            //https://en.wikipedia.org/wiki/Circle#Equations
            //parametric form: x = origin.x + radius * cos(0~2pi)
            // positive angleOffset for counter clockwise
            let angleOffset = this.clockRotation * (this.scene.star.speedMod / 40) * Math.PI / 180; //tweak this for difficulty scaling
            let angle = Math.atan(
                (this.y - this.scene.star.y)
                /
                (this.x - this.scene.star.x)
            );
            if (this.x - this.scene.star.x >= 0) angle += Math.PI;
            
            let accelTowardsThisX = this.x + this.lastDistToStar * Math.cos(angle + angleOffset);
            let accelTowardsThisY = this.y + this.lastDistToStar * Math.sin(angle + angleOffset);

            let addAccelX = this.orbitalAccelMod * (accelTowardsThisX - this.scene.star.x);
            let addAccelY = this.orbitalAccelMod * (accelTowardsThisY - this.scene.star.y);

            // let distCorrection = Math.sqrt(
            //     (accelTowardsThisX - this.scene.star.x) * (accelTowardsThisX - this.scene.star.x)
            //     +
            //     (accelTowardsThisY - this.scene.star.y) * (accelTowardsThisY - this.scene.star.y)
            // ) / 2;
            
            this.orbitalAccelMod *= this.orbitalAccelModScaling;
            this.scene.star.addAcceleration(addAccelX, addAccelY);

            this.canStopOrbiting = true;
            this.isPreOrbiting = false;

        } else if (this.isPreOrbiting) {
            this.lastDistToStar = this.distToStar;
        }
        //star leaving orbital
        else if (this.canStopOrbiting) {
            this.lastDistToStar = this.distToStar;
            //balance this later
            this.orbitalAccelMod = this.orbitalAccelModDefault * 10; //not a full reset of accel but a bit better
            this.currRotationDuration = 0;
            if (this.distToStar - 0.5*this.scene.star.radiusWeighted > this.orbitalRadiusWeighted) {
                this.canReEnterOrbit = false;       
                this.orbitalAccelMod = this.orbitalAccelModDefault;
                this.orbitalEntered = false;
                this.orbitalBody.setEnable(true);
                this.canStopOrbiting = false;
                this.currRotationDuration = 0;

            }
        }
    }

    findClockRotation() {
        //uses velocity vector & distanceToStar vector

        let distVecX = this.x - this.scene.star.x;
        let distVecY = this.y - this.scene.star.y;
        let crossZ = (this.scene.star.x_velocity * distVecY)
                     -
                     (this.scene.star.y_velocity * distVecX);

        if(crossZ >= 0) this.clockRotation = 1;
        else this.clockRotation = -1;
        
    }

    

    
}