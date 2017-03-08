// Copyright 2016 Sasha Kipnis, Sandra Nissim, Katie Chen, Maryam Ahmed

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var app = express();

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.listen((process.env.PORT || 3000));

// Server frontpage
app.get('/', function (req, res) {
    res.send('This is TestBot Server 3');
});

// Facebook Webhook
app.get('/webhook', function (req, res) {
    if (req.query['hub.verify_token'] === 'testbot_verify_token') {
        res.send(req.query['hub.challenge']);
    } else {
        res.send('Invalid verify token');
    }
});

// defining lists as variables
var state = [];
var stack = [];
var deliveryAddress = [];
var getDeliveryAddress = [];

// defining variable for prices
var smallPrice = 6.00;
var mediumPrice = 14.00;
var largePrice = 16.00;
var smallToppingsPrice = 0.50;
var mediumToppingsPrice = 1.25;
var largeToppingsPrice = 1.50;
var finalPrice;

// generic function sending messages
function sendMessage(recipientId, message) {
	
	var userStack = stack[recipientId];
	userStack.push(message);
	stack[recipientId] = userStack;

    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token: process.env.PAGE_ACCESS_TOKEN},
        method: 'POST',
        json: {
            recipient: {id: recipientId},
            message: message,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
    });
};

function orderPizza(recipientId, text) {
    text = text || "";
    text = text.toLowerCase();
    var values = text.split(' ');
    //start pizza order, choose size

    	
    if (values.length === 1) {
    	if (values[0] === 'order') {
    		state[recipientId] = [];
    		stack[recipientId] = [];

            var imageSize = "https://www.cicis.com/media/1138/pizza_trad_pepperoni.png";
            
            message = {
                "attachment": {
                    "type": "template",
                    "payload": {
                        "template_type": "generic",
                        "elements": [{
                            "title": "Choose a Size",
                            "subtitle": "Select an option.",
                            "image_url": imageSize ,
                            "buttons": [
                            	{
	                               
	                                "type": "postback",
	                                "title": "Small $6",
	                               
	                                "payload" : JSON.stringify({
	                                	"type":"size",
	                                	"size":"Small",
	                                	"user":recipientId
	                                }) 
                                }, 
                                {
	                                "type": "postback",
	                                "title": "Medium $14",
	                                
	                                "payload" : JSON.stringify({
	                                	"type":"size",
	                                	"size":"Medium",
	                                	"user":recipientId
	                                })
                            	}, 
                            	{
	                                "type": "postback",
	                                "title": "Large $16",
	                                
	                                "payload" : JSON.stringify({
	                                	"type":"size",
	                                	"size":"Large",
	                                	"user":recipientId
	                                })

                            }]
                        }]
                    }
                }
            }
    		
            sendMessage(recipientId, message);
            return true;
        // go back to previous button
        } else if (values[0] === 'back') {
        	var userStack = stack[recipientId];
        	if (userStack.length === 0){
        		sendMessage(recipientId, {text: "Please Start your Order."});
        		// Remove "please start your order from stack list"
        		userStack = stack[recipientId];
        		userStack.pop();
        		stack[recipientId] = userStack;
        		return true;
        	} else if (userStack.length === 1) {
        		var prevMessage = userStack.pop();
        		stack[recipientId] = userStack;
        		sendMessage(recipientId, prevMessage);
        		return true;
        	} else {
        		// pop twice to remove latest message to get to the one before that
        		userStack.pop();
        		var prevMessage = userStack.pop();
        		stack[recipientId] = userStack;

        		var userState = state[recipientId];
    			userState.pop();
    			state[recipientId] = userState;

        		sendMessage(recipientId, prevMessage);
        		return true;
        	}
        	
        } else if (values[0] === 'prices') {
        	sendMessage(recipientId, {text: "Small Pizza $6 + $0.50 per Topping. \nMedium Pizza $14 + $1.25 per Topping. \nLarge Pizza $16 + $1.50 per Topping."});
        	return true;
        }
    } else {
    	var setDeliveryAddress = getDeliveryAddress[recipientId];
    	if (setDeliveryAddress !== undefined && setDeliveryAddress === true){
    		getDeliveryAddress[recipientId] = false;
    		deliveryAddress[recipientId] = text;
    		var message = {
		        "attachment": {
		            "type": "template",
		            "payload": {
		                "template_type": "generic",
		                "elements": [{
		                    "title": "Please confirm your address.",
		                    "subtitle": " " + deliveryAddress[recipientId],
		                    "buttons": [{
		                        "type": "postback",
		                        "title": "Confirm",
		                        "payload" : JSON.stringify({
		                            "type":"confirmation",
		                            "confirmation":"Confirm",
		                            "user":recipientId
		                            })
		                    	}, {
		                        "type": "postback",
		                        "title": "Incorrect",
		                        "payload" : JSON.stringify({
		                            "type":"deliverTo",
		                            "deliverTo":"Incorrect",
		                            "user":recipientId
		                        	})
		                    	}]
		                }]
		            }
		        }
		    }
    		sendMessage(recipientId, message);
        	return true;
    	}
    }

    var userStack = stack[recipientId];
    if (userStack === undefined) {
    	stack[recipientId] = [];
    }

    return false;
};


// handler receiving messages
function receivedMessage(event){
	if (!orderPizza(event.sender.id, event.message.text)) {
        sendMessage(event.sender.id, {text: "Type 'order' to start. \nType 'prices' to see prices. \nType 'back' to go back."});
    }
}

function processSize(payload, recipientId){
	var size = payload.size;
	var user = payload.user;
    //choose toppings
    
    if (size !== "Toppings"){
		var userState = state[recipientId];
		userState.push(size);
		state[recipientId] = userState;
    }
    


	var imageSize = "https://www.cicis.com/media/1138/pizza_trad_pepperoni.png";
            
    var message = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                    "title": "Choose Your Toppings",
                    "subtitle": "Select an option.",
                    "image_url": imageSize ,
                    "buttons": [{
                        "type": "postback",
                        "title": "Meats",
                        "payload" : JSON.stringify({
                                "type":"toppingsMeats",
                                "toppingsMeats":"Meats",
                                "user":recipientId
                            }) 
                        }, {
                        "type": "postback",
                        "title": "Veggies",
                        "payload" : JSON.stringify({
                            "type":"toppingsVeggies",
                            "toppingsVeggies":"Veggies",
                            "user":recipientId
                            }) 
                        }, {
                        "type": "postback",
                        "title": "Premade",
                        "payload" : JSON.stringify({
                            "type":"toppingsPremade",
                            "toppingsPremade":"Premade",
                            "user":recipientId
                            }) 
                    }]
                }]
            }
        }
    };

	return message;
};

function processToppingsMeats(payload, recipientId){
    var toppingsMeats = payload.toppingsMeats;
    var user = payload.user;
    var imageMeats = "http://home.aubg.edu/students/MRG120/Website%20-%20Project%202/Project2_NEW/images/meat.png";
    
    var message = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                    "title": "Choose a Meat",
                    "subtitle": "Select an option.",
                    "image_url": imageMeats ,
                    "buttons": [{
                        "type": "postback",
                        "title": "Pepperoni",
                        "payload" : JSON.stringify({
                            "type":"Meats",
                            "Meats":" Pepperoni",
                            "user":recipientId
                            }) 
                        }, {
                        "type": "postback",
                        "title": "Sausage",
                        "payload" : JSON.stringify({
                            "type":"Meats",
                            "Meats":" Sausage",
                            "user":recipientId
                            })
                        }, {
                        "type": "postback",
                        "title": "Bacon",
                        "payload" : JSON.stringify({
                            "type":"Meats",
                            "Meats":" Bacon",
                            "user":recipientId
                            }) 
                    }]
                }]
            }
        }
    };

	return message;
};

function processToppingsVeggies(payload, recipientId){
    var toppingsVeggies = payload.toppingsVeggies;
    var user = payload.user;
    var imageVeggies = "https://sanjosepizzaexpress.com/wp-content/uploads/2014/10/Vegetarian-Pizza.png";
    
    var message = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                    "title": "Choose a Veggie",
                    "subtitle": "Select an option.",
                    "image_url": imageVeggies ,
                    "buttons": [{
                        "type": "postback",
                        "title": "Green Peppers",
                        "payload" : JSON.stringify({
                            "type":"Veggies",
                            "Veggies":" Green Peppers",
                            "user":recipientId
                            })
                        }, {
                        "type": "postback",
                        "title": "Mushrooms",
                        "payload" : JSON.stringify({
                            "type":"Veggies",
                            "Veggies":" Mushrooms",
                            "user":recipientId
                            })
                        }, {
                        "type": "postback",
                        "title": "Olives",
                        "payload" : JSON.stringify({
                            "type":"Veggies",
                            "Veggies":" Olives",
                            "user":recipientId
                            }) 
                    }]
                }]
            }
        }
    };

	return message;
};

function processToppingsPremade(payload, recipientId){
    var toppingsPremade = payload.toppingsPremade;
    var user = payload.user; 
    var imagePremade = "http://www.farmhousepizza.org/image/catalog/pizza/hawaiian-pizza.png";
    
    var message = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                    "title": "Choose a Premade Pizza",
                    "subtitle": "Select an option.",
                    "image_url": imagePremade ,
                    "buttons": [{
                        "type": "postback",
                        "title": "Cheese",
                        "payload" : JSON.stringify({
                            "type":"Premade",
                            "Premade":" Cheese",
                            "user":recipientId
                            })
                        }, {
                        "type": "postback",
                        "title": "Hawaiian",
                        "payload" : JSON.stringify({
                            "type":"Premade",
                            "Premade":" Hawaiian",
                            "user":recipientId
                            })
                        }, {
                        "type": "postback",
                        "title": "Vegetarian",
                        "payload" : JSON.stringify({
                            "type":"Premade",
                            "Premade":" Vegetarian",
                            "user":recipientId
                            }) 
                    }]
                }]
            }
        }
    };

	return message;
};

function processToppingChoiceMeats(payload, recipientId){
    var Meats = payload.Meats;
    var user = payload.user;
    // continue order
    var userState = state[recipientId];
    userState.push(Meats);
    state[recipientId] = userState;


    var imageSize = "https://www.cicis.com/media/1138/pizza_trad_pepperoni.png";
    
    var message = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                    "title": "Continue Order",
                    "subtitle": "Select an option.",
                    "image_url": imageSize ,
                    "buttons": [{
                    	"type": "postback",
                        "title": "Toppings",
                        "payload" : JSON.stringify({
                            "type":"size",
                            "size":"Toppings",
                            "user":recipientId
                        })

                        }, {
                        "type": "postback",
                        "title": "Done",
                        "payload" : JSON.stringify({
                            "type":"Finish",
                            "Finish":"Done",
                            "user":recipientId
                            })
                    }]
                }]
            }
        }
    };
    
	return message;
};

function processToppingChoiceVeggies(payload, recipientId){
    var Veggies = payload.Veggies;
    var user = payload.user;
    //continue order
    var userState = state[recipientId];
    userState.push(Veggies);
    state[recipientId] = userState;


    var imageSize = "https://www.cicis.com/media/1138/pizza_trad_pepperoni.png";
    
    var message = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                    "title": "Continue Order",
                    "subtitle": "Select an option.",
                    "image_url": imageSize ,
                    "buttons": [{
                        "type": "postback",
                        "title": "Toppings",
                        "payload" : JSON.stringify({
                            "type":"size",
                            "size":"Toppings",
                            "user":recipientId
                        })
                        }, {
                        "type": "postback",
                        "title": "Done",
                        "payload" : JSON.stringify({
                            "type":"Finish",
                            "Finish":"Done",
                            "user":recipientId
                        })
                    }]
                }]
            }
        }
    };
    
    return message;
};

function processToppingChoicePremade(payload, recipientId){
    var Premade = payload.Premade;
    var user = payload.user;
    //continue order
    var userState = state[recipientId];
    userState.push(Premade);
    state[recipientId] = userState;


    var imageSize = "https://www.cicis.com/media/1138/pizza_trad_pepperoni.png";
            
    var message = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                    "title": "Continue Order",
                    "subtitle": "Select an option.",
                    "image_url": imageSize ,
                    "buttons": [{
                        "type": "postback",
                        "title": "Toppings",
                        "payload" : JSON.stringify({
                            "type":"size",
                            "size":"Toppings",
                            "user":recipientId
                        })
                        }, {
                        "type": "postback",
                        "title": "Done",
                        "payload" : JSON.stringify({
                            "type":"Finish",
                            "Finish":"Done",
                            "user":recipientId
                            })
                    }]
                }]
            }
        }
    };

    return message;
};

function processEditOrder(payload, recipientId){
    var editOrder = payload.editOrder;
    var user = payload.user;
    //continue order
	var imageSize = "https://www.cicis.com/media/1138/pizza_trad_pepperoni.png";
            
    var message = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                    "title": "Continue Order",
                    "subtitle": "Select an option.",
                    "image_url": imageSize ,
                    "buttons": [{
                        "type": "postback",
                        "title": "Toppings",
                        "payload" : JSON.stringify({
                            "type":"size",
                            "size":"Toppings",
                            "user":recipientId
                        })
                        }, {
                        "type": "postback",
                        "title": "Done",
                        "payload" : JSON.stringify({
                            "type":"Finish",
                            "Finish":"Done",
                            "user":recipientId
                            })
                    }]
                }]
            }
        }
    };

    return message;
};

function carryOutDelivery(payload, recipientId){
	var Finish = payload.Finish;
    var user = payload.user;
    //continue order
	var imageSize = "http://theduanewells.com/wp-content/uploads/2013/10/wildcraft-pizza.jpeg";
            
    var message = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                    "title": "Carry Out or Delivery?",
                    "subtitle": "Select an option.",
                    "image_url": imageSize ,
                    "buttons": [{
                        "type": "postback",
                        "title": "Carry Out",
                        "payload" : JSON.stringify({
                            "type":"confirmation",
                            "confirmation":"Carry Out",
                            "user":recipientId
                        })
                        }, {
                        "type": "postback",
                        "title": "Delivery",
                        "payload" : JSON.stringify({
                            "type":"deliverTo",
                            "deliverTo":"Delivery",
                            "user":recipientId
                            })
                    }]
                }]
            }
        }
    };

    return message;
};

function inputAddress(payload, recipientId) {
	var deliverTo = payload.deliverTo;
	var user = payload.user;
	getDeliveryAddress[recipientId] = true;
	var message = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                    "title": "Please Enter Your Address:",
                    "subtitle": "Street, City, State, Zip Code"
                }]
            }
        }
    };

    return message;
}; 

function processOrderStatus(payload, recipientId){
    var confirmation = payload.confirmation;
    var user = payload.user;
    // delivery confirmation
    finalPrice = 0
    var finalSize = state[recipientId][0];
    finalSize = finalSize.toLowerCase();
    JSON.stringify(finalSize);
    if (finalSize === "small"){
        var userState = state[recipientId];
        finalPrice = userState.length - 2;
        finalPrice = finalPrice * smallToppingsPrice;
        finalPrice += smallPrice;
        state[recipientId] = userState;
    }
    if (finalSize === "medium"){
        var userState = state[recipientId];
        finalPrice = userState.length - 2;
        finalPrice = finalPrice * mediumToppingsPrice;
        finalPrice += mediumPrice;
        state[recipientId] = userState;
    }
    if (finalSize === "large"){
        var userState = state[recipientId];
        finalPrice = userState.length - 2;
        finalPrice = finalPrice * largeToppingsPrice;
        finalPrice += largePrice;
        state[recipientId] = userState;
    }
    var imageDone = "http://pedonespizza.com/wp-content/uploads/2014/01/Best-Hermosa-Beach-Pizza-Delivery.jpg";
    var message = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                    "title": "Order Confirmation",
                    "subtitle": state[recipientId] + " Pizza. Total Cost: $" + finalPrice.toFixed(2),
                    "image_url": imageDone ,
                    "buttons": [{
                    	"type": "postback",
                        "title": "Edit Order",
                        "payload" : JSON.stringify({
                            "type": "editOrder",
                            "editOrder": "Edit Order",
                            "user":recipientId
                        })
                        }, {
                       	"type": "postback",
                        "title": "Cancel Order",
                        "payload" : JSON.stringify({
                            "type": "noLink",
                            "noLink": "Cancel Order",
                            "user":recipientId
                            })
                        }, {
                        "type": "postback",
                        "title": "Place Your Order",
                        "payload" : JSON.stringify({
                            "type": "delivery",
                            "delivery": "Place Your Order",
                            "user":recipientId
                            })
                    }]
                }]
            }
        }
    };
   
	return message;
};

function processFinalOrder(payload, recipientId){
    var delivery = payload.delivery;
    var user = payload.user;
    var message = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                    "title": "Your Pizza is On its Way!",
                    "subtitle": " Thank You for Ordering!"
                }]
            }
        }
    };

    return message;
}; 

function receivedPostback(event){
	var message;
	if (event.postback.payload) {
		var payload = JSON.parse(event.postback.payload);
	    var type = payload.type;
	     
	    if (type === "size") {
	    	message = processSize(payload, event.sender.id);
	    } 
	   	else if (type === "toppingsMeats"){
	    	message = processToppingsMeats(payload, event.sender.id);	
	    }
	    else if (type === "toppingsVeggies"){
	    	message = processToppingsVeggies(payload, event.sender.id);	
	    }
	    else if (type === "toppingsPremade"){
	    	message = processToppingsPremade(payload, event.sender.id);	
	    }
	    else if (type === "Meats"){
	    	message = processToppingChoiceMeats(payload, event.sender.id);
	    }
	    else if (type === "Veggies"){
	    	message = processToppingChoiceVeggies(payload, event.sender.id);
	    }
	    else if (type === "Premade"){
	    	message = processToppingChoicePremade(payload, event.sender.id);
	    }
	    else if (type === "deliverTo"){
	    	message = inputAddress(payload, event.sender.id);
	    }
	    else if (type === "confirmation"){
	    	message = processOrderStatus(payload, event.sender.id);
	    }
	    else if (type === "editOrder"){
	    	message = processEditOrder(payload, event.sender.id);
	    }
	    else if (type === "Finish"){
	    	message = carryOutDelivery(payload, event.sender.id);
	    }
	    else if (type === "delivery"){
	    	message = processFinalOrder(payload, event.sender.id);
	    }
	    else {
	    	message = " Unknown Type";
	    }
	} else {
		message = " Missing Payload";
	}
    sendMessage(event.sender.id, message); 
};

app.post('/webhook', function (req, res) {
    var data = req.body;
    for (j = 0; j < data.entry.length; j++) {
    	var events = data.entry[j].messaging;

	    for (i = 0; i < events.length; i++) {
	        var event = events[i];
	   
	        if (event.message && event.message.text) {
	    		receivedMessage(event);	

	    	} 
	    	else if (event.postback) {
	   			receivedPostback(event);
	        }
	    }
	}
    res.sendStatus(200);
});