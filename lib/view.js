var utils = require('bdsft-sdk-utils')
var Factory = require('bdsft-sdk-factory');
var StylesManager = require('bdsft-sdk-styles');
var core = require('bdsft-sdk-core')

module.exports = View;

function View(constructor, options) {
	var self = {};

	self.options = options;
	self.argNames = utils.argNamesFun(constructor);
	self.name = utils.functionName(constructor);
	self.viewName = self.name.replace('view', '');
	self.constructor = constructor;

	self.create = function(constructorArgs, createOptions) {
		constructorArgs = constructorArgs || [];
		createOptions = createOptions || {};
		options = options || {};
		var object = utils.createFun(constructor, constructorArgs);

		object.create = function(name, args, opts) {
			return Factory(createOptions)(name, self, name, args, opts);
		};
		object.appendTo = function(view) {
			object.view.appendTo(view);
		};
		object.updateContentView = function(contentView, items, createItemViewCallback) {
			object._contentViews = object._contentViews || {};
			var siblingView;
			for (var name in items) {
				var item = items[name];
	      		var view = object._contentViews[name];
	      		if(!view) {
					var view = createItemViewCallback(item);
					object._contentViews[name] = view;
					if(siblingView) {
						view.view.insertAfter(siblingView.view);
					} else {
						view.view.prependTo(contentView);
					}
	      		}
	      		siblingView = view;
			}
			for(var name in object._contentViews) {
				if(!items[name]) {
					object._contentViews[name].view.remove();
					delete object._contentViews[name];
				}
			}
		};

		object._name = self.name;
		object.databinder = core.databinder(self.viewName, constructorArgs, object);
		var view = createOptions.template && createOptions.template[self.viewName] && createOptions.template[self.viewName]() || options.template && options.template[self.viewName] && options.template[self.viewName]() || object.template;
		if (!view) {
			console.error('no view template found : ' + self.viewName);
			return;
		}
		object.view = require('jquery')(view);
		(object.elements || []).forEach(function(element) {
			require('./element')(object, element, object.databinder);
		});
		// init bindings before init to avoid multiple databinder calls for view and model
		core.bindings(object, constructorArgs);
		core.call(object, 'listeners', options, constructorArgs);
		core.call(object, 'init', options, constructorArgs);

		StylesManager.inject(self.viewName, createOptions, options);

		var classesHolder = object.view.find('.classes:first');
		if (classesHolder.length === 0) {
			classesHolder = object.view;
		}
		var classes = classesHolder.attr('class');
		object.databinder.onModelPropChange('classes', function(value) {
			classesHolder.attr('class', classes + ' ' + value.join(' '));
		});

		return object;
	};

	return self;
}