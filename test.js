var webdriver = require('selenium-webdriver');
var monitor = {width: 1920, height : 1200};
var host = "http://localhost:8000/";
var browser = new webdriver.Builder().withCapabilities(webdriver.Capabilities.chrome()).build();
browser.manage().window().setPosition(0, 0);
browser.manage().window().setSize(monitor.width / 2, monitor.height);
browser.get(host);
