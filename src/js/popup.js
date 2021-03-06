chrome.extension.sendMessage({}, function(response) {
	var readyStateCheckInterval = setInterval(function() {
		if (document.readyState === "complete") {
			clearInterval(readyStateCheckInterval);
			chrome.cookies.getAll({},function (cookie){
	        	var table = document.getElementById("test");
	        	for(i=0;i<cookie.length;i++){
	        		var row = table.insertRow(i+1);
	        		var cell1 = row.insertCell(0);
					//alert(JSON.stringify(cookie[i]));
					//alert((cookie[i]).domain);
	            	cell1.innerHTML = (cookie[i]).domain;
	        	}
	    	});
		}
	}, 10);
});

document.addEventListener('DOMContentLoaded', function () {
    var links = document.getElementsByTagName("a");
    for (var i = 0; i < links.length; i++) {
        (function () {
            var ln = links[i];
            var location = ln.href;
            ln.onclick = function () {
                chrome.tabs.create({active: true, url: location});
            };
        })();
    }
});
