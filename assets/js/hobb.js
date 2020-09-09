/**
 * @file
 * Drupal Bootstrap object.
 */

/**
 * All Drupal Bootstrap JavaScript APIs are contained in this namespace.
 *
 * @namespace
 */
(function (_, $, Drupal, drupalSettings) {
  'use strict';

  var Bootstrap = {
    processedOnce: {},
    settings: drupalSettings.bootstrap || {}
  };

  /**
   * Wraps Drupal.checkPlain() to ensure value passed isn't empty.
   *
   * Encodes special characters in a plain-text string for display as HTML.
   *
   * @param {string} str
   *   The string to be encoded.
   *
   * @return {string}
   *   The encoded string.
   *
   * @ingroup sanitization
   */
  Bootstrap.checkPlain = function (str) {
    return str && Drupal.checkPlain(str) || '';
  };

  /**
   * Creates a jQuery plugin.
   *
   * @param {String} id
   *   A jQuery plugin identifier located in $.fn.
   * @param {Function} plugin
   *   A constructor function used to initialize the for the jQuery plugin.
   * @param {Boolean} [noConflict]
   *   Flag indicating whether or not to create a ".noConflict()" helper method
   *   for the plugin.
   */
  Bootstrap.createPlugin = function (id, plugin, noConflict) {
    // Immediately return if plugin doesn't exist.
    if ($.fn[id] !== void 0) {
      return this.fatal('Specified jQuery plugin identifier already exists: @id. Use Drupal.bootstrap.replacePlugin() instead.', {'@id': id});
    }

    // Immediately return if plugin isn't a function.
    if (typeof plugin !== 'function') {
      return this.fatal('You must provide a constructor function to create a jQuery plugin "@id": @plugin', {'@id': id, '@plugin':  plugin});
    }

    // Add a ".noConflict()" helper method.
    this.pluginNoConflict(id, plugin, noConflict);

    $.fn[id] = plugin;
  };

  /**
   * Diff object properties.
   *
   * @param {...Object} objects
   *   Two or more objects. The first object will be used to return properties
   *   values.
   *
   * @return {Object}
   *   Returns the properties of the first passed object that are not present
   *   in all other passed objects.
   */
  Bootstrap.diffObjects = function (objects) {
    var args = Array.prototype.slice.call(arguments);
    return _.pick(args[0], _.difference.apply(_, _.map(args, function (obj) {
      return Object.keys(obj);
    })));
  };

  /**
   * Map of supported events by regular expression.
   *
   * @type {Object<Event|MouseEvent|KeyboardEvent|TouchEvent,RegExp>}
   */
  Bootstrap.eventMap = {
    Event: /^(?:load|unload|abort|error|select|change|submit|reset|focus|blur|resize|scroll)$/,
    MouseEvent: /^(?:click|dblclick|mouse(?:down|enter|leave|up|over|move|out))$/,
    KeyboardEvent: /^(?:key(?:down|press|up))$/,
    TouchEvent: /^(?:touch(?:start|end|move|cancel))$/
  };

  /**
   * Extends a jQuery Plugin.
   *
   * @param {String} id
   *   A jQuery plugin identifier located in $.fn.
   * @param {Function} callback
   *   A constructor function used to initialize the for the jQuery plugin.
   *
   * @return {Function|Boolean}
   *   The jQuery plugin constructor or FALSE if the plugin does not exist.
   */
  Bootstrap.extendPlugin = function (id, callback) {
    // Immediately return if plugin doesn't exist.
    if (typeof $.fn[id] !== 'function') {
      return this.fatal('Specified jQuery plugin identifier does not exist: @id', {'@id':  id});
    }

    // Immediately return if callback isn't a function.
    if (typeof callback !== 'function') {
      return this.fatal('You must provide a callback function to extend the jQuery plugin "@id": @callback', {'@id': id, '@callback':  callback});
    }

    // Determine existing plugin constructor.
    var constructor = $.fn[id] && $.fn[id].Constructor || $.fn[id];
    var plugin = callback.apply(constructor, [this.settings]);
    if (!$.isPlainObject(plugin)) {
      return this.fatal('Returned value from callback is not a plain object that can be used to extend the jQuery plugin "@id": @obj', {'@obj':  plugin});
    }

    this.wrapPluginConstructor(constructor, plugin, true);

    return $.fn[id];
  };

  Bootstrap.superWrapper = function (parent, fn) {
    return function () {
      var previousSuper = this.super;
      this.super = parent;
      var ret = fn.apply(this, arguments);
      if (previousSuper) {
        this.super = previousSuper;
      }
      else {
        delete this.super;
      }
      return ret;
    };
  };

  /**
   * Provide a helper method for displaying when something is went wrong.
   *
   * @param {String} message
   *   The message to display.
   * @param {Object} [args]
   *   An arguments to use in message.
   *
   * @return {Boolean}
   *   Always returns FALSE.
   */
  Bootstrap.fatal = function (message, args) {
    if (this.settings.dev && console.warn) {
      for (var name in args) {
        if (args.hasOwnProperty(name) && typeof args[name] === 'object') {
          args[name] = JSON.stringify(args[name]);
        }
      }
      Drupal.throwError(new Error(Drupal.formatString(message, args)));
    }
    return false;
  };

  /**
   * Intersects object properties.
   *
   * @param {...Object} objects
   *   Two or more objects. The first object will be used to return properties
   *   values.
   *
   * @return {Object}
   *   Returns the properties of first passed object that intersects with all
   *   other passed objects.
   */
  Bootstrap.intersectObjects = function (objects) {
    var args = Array.prototype.slice.call(arguments);
    return _.pick(args[0], _.intersection.apply(_, _.map(args, function (obj) {
      return Object.keys(obj);
    })));
  };

  /**
   * Normalizes an object's values.
   *
   * @param {Object} obj
   *   The object to normalize.
   *
   * @return {Object}
   *   The normalized object.
   */
  Bootstrap.normalizeObject = function (obj) {
    if (!$.isPlainObject(obj)) {
      return obj;
    }

    for (var k in obj) {
      if (typeof obj[k] === 'string') {
        if (obj[k] === 'true') {
          obj[k] = true;
        }
        else if (obj[k] === 'false') {
          obj[k] = false;
        }
        else if (obj[k].match(/^[\d-.]$/)) {
          obj[k] = parseFloat(obj[k]);
        }
      }
      else if ($.isPlainObject(obj[k])) {
        obj[k] = Bootstrap.normalizeObject(obj[k]);
      }
    }

    return obj;
  };

  /**
   * An object based once plugin (similar to jquery.once, but without the DOM).
   *
   * @param {String} id
   *   A unique identifier.
   * @param {Function} callback
   *   The callback to invoke if the identifier has not yet been seen.
   *
   * @return {Bootstrap}
   */
  Bootstrap.once = function (id, callback) {
    // Immediately return if identifier has already been processed.
    if (this.processedOnce[id]) {
      return this;
    }
    callback.call(this, this.settings);
    this.processedOnce[id] = true;
    return this;
  };

  /**
   * Provide jQuery UI like ability to get/set options for Bootstrap plugins.
   *
   * @param {string|object} key
   *   A string value of the option to set, can be dot like to a nested key.
   *   An object of key/value pairs.
   * @param {*} [value]
   *   (optional) A value to set for key.
   *
   * @returns {*}
   *   - Returns nothing if key is an object or both key and value parameters
   *   were provided to set an option.
   *   - Returns the a value for a specific setting if key was provided.
   *   - Returns an object of key/value pairs of all the options if no key or
   *   value parameter was provided.
   *
   * @see https://github.com/jquery/jquery-ui/blob/master/ui/widget.js
   */
  Bootstrap.option = function (key, value) {
    var options = $.isPlainObject(key) ? $.extend({}, key) : {};

    // Get all options (clone so it doesn't reference the internal object).
    if (arguments.length === 0) {
      return $.extend({}, this.options);
    }

    // Get/set single option.
    if (typeof key === "string") {
      // Handle nested keys in dot notation.
      // e.g., "foo.bar" => { foo: { bar: true } }
      var parts = key.split('.');
      key = parts.shift();
      var obj = options;
      if (parts.length) {
        for (var i = 0; i < parts.length - 1; i++) {
          obj[parts[i]] = obj[parts[i]] || {};
          obj = obj[parts[i]];
        }
        key = parts.pop();
      }

      // Get.
      if (arguments.length === 1) {
        return obj[key] === void 0 ? null : obj[key];
      }

      // Set.
      obj[key] = value;
    }

    // Set multiple options.
    $.extend(true, this.options, options);
  };

  /**
   * Adds a ".noConflict()" helper method if needed.
   *
   * @param {String} id
   *   A jQuery plugin identifier located in $.fn.
   * @param {Function} plugin
   * @param {Function} plugin
   *   A constructor function used to initialize the for the jQuery plugin.
   * @param {Boolean} [noConflict]
   *   Flag indicating whether or not to create a ".noConflict()" helper method
   *   for the plugin.
   */
  Bootstrap.pluginNoConflict = function (id, plugin, noConflict) {
    if (plugin.noConflict === void 0 && (noConflict === void 0 || noConflict)) {
      var old = $.fn[id];
      plugin.noConflict = function () {
        $.fn[id] = old;
        return this;
      };
    }
  };

  /**
   * Replaces a Bootstrap jQuery plugin definition.
   *
   * @param {String} id
   *   A jQuery plugin identifier located in $.fn.
   * @param {Function} callback
   *   A callback function that is immediately invoked and must return a
   *   function that will be used as the plugin constructor.
   * @param {Boolean} [noConflict]
   *   Flag indicating whether or not to create a ".noConflict()" helper method
   *   for the plugin.
   */
  Bootstrap.replacePlugin = function (id, callback, noConflict) {
    // Immediately return if plugin doesn't exist.
    if (typeof $.fn[id] !== 'function') {
      return this.fatal('Specified jQuery plugin identifier does not exist: @id', {'@id':  id});
    }

    // Immediately return if callback isn't a function.
    if (typeof callback !== 'function') {
      return this.fatal('You must provide a valid callback function to replace a jQuery plugin: @callback', {'@callback': callback});
    }

    // Determine existing plugin constructor.
    var constructor = $.fn[id] && $.fn[id].Constructor || $.fn[id];
    var plugin = callback.apply(constructor, [this.settings]);

    // Immediately return if plugin isn't a function.
    if (typeof plugin !== 'function') {
      return this.fatal('Returned value from callback is not a usable function to replace a jQuery plugin "@id": @plugin', {'@id': id, '@plugin': plugin});
    }

    this.wrapPluginConstructor(constructor, plugin);

    // Add a ".noConflict()" helper method.
    this.pluginNoConflict(id, plugin, noConflict);

    $.fn[id] = plugin;
  };

  /**
   * Simulates a native event on an element in the browser.
   *
   * Note: This is a fairly complete modern implementation. If things aren't
   * working quite the way you intend (in older browsers), you may wish to use
   * the jQuery.simulate plugin. If it's available, this method will defer to
   * that plugin.
   *
   * @see https://github.com/jquery/jquery-simulate
   *
   * @param {HTMLElement|jQuery} element
   *   A DOM element to dispatch event on. Note: this may be a jQuery object,
   *   however be aware that this will trigger the same event for each element
   *   inside the jQuery collection; use with caution.
   * @param {String|String[]} type
   *   The type(s) of event to simulate.
   * @param {Object} [options]
   *   An object of options to pass to the event constructor. Typically, if
   *   an event is being proxied, you should just pass the original event
   *   object here. This allows, if the browser supports it, to be a truly
   *   simulated event.
   *
   * @return {Boolean}
   *   The return value is false if event is cancelable and at least one of the
   *   event handlers which handled this event called Event.preventDefault().
   *   Otherwise it returns true.
   */
  Bootstrap.simulate = function (element, type, options) {
    // Handle jQuery object wrappers so it triggers on each element.
    var ret = true;
    if (element instanceof $) {
      element.each(function () {
        if (!Bootstrap.simulate(this, type, options)) {
          ret = false;
        }
      });
      return ret;
    }

    if (!(element instanceof HTMLElement)) {
      this.fatal('Passed element must be an instance of HTMLElement, got "@type" instead.', {
        '@type': typeof element,
      });
    }

    // Defer to the jQuery.simulate plugin, if it's available.
    if (typeof $.simulate === 'function') {
      new $.simulate(element, type, options);
      return true;
    }

    var event;
    var ctor;
    var types = [].concat(type);
    for (var i = 0, l = types.length; i < l; i++) {
      type = types[i];
      for (var name in this.eventMap) {
        if (this.eventMap[name].test(type)) {
          ctor = name;
          break;
        }
      }
      if (!ctor) {
        throw new SyntaxError('Only rudimentary HTMLEvents, KeyboardEvents and MouseEvents are supported: ' + type);
      }
      var opts = {bubbles: true, cancelable: true};
      if (ctor === 'KeyboardEvent' || ctor === 'MouseEvent') {
        $.extend(opts, {ctrlKey: !1, altKey: !1, shiftKey: !1, metaKey: !1});
      }
      if (ctor === 'MouseEvent') {
        $.extend(opts, {button: 0, pointerX: 0, pointerY: 0, view: window});
      }
      if (options) {
        $.extend(opts, options);
      }
      if (typeof window[ctor] === 'function') {
        event = new window[ctor](type, opts);
        if (!element.dispatchEvent(event)) {
          ret = false;
        }
      }
      else if (document.createEvent) {
        event = document.createEvent(ctor);
        event.initEvent(type, opts.bubbles, opts.cancelable);
        if (!element.dispatchEvent(event)) {
          ret = false;
        }
      }
      else if (typeof element.fireEvent === 'function') {
        event = $.extend(document.createEventObject(), opts);
        if (!element.fireEvent('on' + type, event)) {
          ret = false;
        }
      }
      else if (typeof element[type]) {
        element[type]();
      }
    }
    return ret;
  };

  /**
   * Strips HTML and returns just text.
   *
   * @param {String|Element|jQuery} html
   *   A string of HTML content, an Element DOM object or a jQuery object.
   *
   * @return {String}
   *   The text without HTML tags.
   *
   * @todo Replace with http://locutus.io/php/strings/strip_tags/
   */
  Bootstrap.stripHtml = function (html) {
    if (html instanceof $) {
      html = html.html();
    }
    else if (html instanceof Element) {
      html = html.innerHTML;
    }
    var tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return (tmp.textContent || tmp.innerText || '').replace(/^[\s\n\t]*|[\s\n\t]*$/, '');
  };

  /**
   * Provide a helper method for displaying when something is unsupported.
   *
   * @param {String} type
   *   The type of unsupported object, e.g. method or option.
   * @param {String} name
   *   The name of the unsupported object.
   * @param {*} [value]
   *   The value of the unsupported object.
   */
  Bootstrap.unsupported = function (type, name, value) {
    Bootstrap.warn('Unsupported by Drupal Bootstrap: (@type) @name -> @value', {
      '@type': type,
      '@name': name,
      '@value': typeof value === 'object' ? JSON.stringify(value) : value
    });
  };

  /**
   * Provide a helper method to display a warning.
   *
   * @param {String} message
   *   The message to display.
   * @param {Object} [args]
   *   Arguments to use as replacements in Drupal.formatString.
   */
  Bootstrap.warn = function (message, args) {
    if (this.settings.dev && console.warn) {
      console.warn(Drupal.formatString(message, args));
    }
  };

  /**
   * Wraps a plugin with common functionality.
   *
   * @param {Function} constructor
   *   A plugin constructor being wrapped.
   * @param {Object|Function} plugin
   *   The plugin being wrapped.
   * @param {Boolean} [extend = false]
   *   Whether to add super extensibility.
   */
  Bootstrap.wrapPluginConstructor = function (constructor, plugin, extend) {
    var proto = constructor.prototype;

    // Add a jQuery UI like option getter/setter method.
    var option = this.option;
    if (proto.option === void(0)) {
      proto.option = function () {
        return option.apply(this, arguments);
      };
    }

    if (extend) {
      // Handle prototype properties separately.
      if (plugin.prototype !== void 0) {
        for (var key in plugin.prototype) {
          if (!plugin.prototype.hasOwnProperty(key)) continue;
          var value = plugin.prototype[key];
          if (typeof value === 'function') {
            proto[key] = this.superWrapper(proto[key] || function () {}, value);
          }
          else {
            proto[key] = $.isPlainObject(value) ? $.extend(true, {}, proto[key], value) : value;
          }
        }
      }
      delete plugin.prototype;

      // Handle static properties.
      for (key in plugin) {
        if (!plugin.hasOwnProperty(key)) continue;
        value = plugin[key];
        if (typeof value === 'function') {
          constructor[key] = this.superWrapper(constructor[key] || function () {}, value);
        }
        else {
          constructor[key] = $.isPlainObject(value) ? $.extend(true, {}, constructor[key], value) : value;
        }
      }
    }
  };

  /**
   * Add Bootstrap to the global Drupal object.
   *
   * @type {Bootstrap}
   */
  Drupal.bootstrap = Drupal.bootstrap || Bootstrap;

})(window._, window.jQuery, window.Drupal, window.drupalSettings);
;
(function ($, _) {

  /**
   * @class Attributes
   *
   * Modifies attributes.
   *
   * @param {Object|Attributes} attributes
   *   An object to initialize attributes with.
   */
  var Attributes = function (attributes) {
    this.data = {};
    this.data['class'] = [];
    this.merge(attributes);
  };

  /**
   * Renders the attributes object as a string to inject into an HTML element.
   *
   * @return {String}
   *   A rendered string suitable for inclusion in HTML markup.
   */
  Attributes.prototype.toString = function () {
    var output = '';
    var name, value;
    var checkPlain = function (str) {
      return str && str.toString().replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') || '';
    };
    var data = this.getData();
    for (name in data) {
      if (!data.hasOwnProperty(name)) continue;
      value = data[name];
      if (_.isFunction(value)) value = value();
      if (_.isObject(value)) value = _.values(value);
      if (_.isArray(value)) value = value.join(' ');
      output += ' ' + checkPlain(name) + '="' + checkPlain(value) + '"';
    }
    return output;
  };

  /**
   * Renders the Attributes object as a plain object.
   *
   * @return {Object}
   *   A plain object suitable for inclusion in DOM elements.
   */
  Attributes.prototype.toPlainObject = function () {
    var object = {};
    var name, value;
    var data = this.getData();
    for (name in data) {
      if (!data.hasOwnProperty(name)) continue;
      value = data[name];
      if (_.isFunction(value)) value = value();
      if (_.isObject(value)) value = _.values(value);
      if (_.isArray(value)) value = value.join(' ');
      object[name] = value;
    }
    return object;
  };

  /**
   * Add class(es) to the array.
   *
   * @param {string|Array} value
   *   An individual class or an array of classes to add.
   *
   * @return {Attributes}
   *
   * @chainable
   */
  Attributes.prototype.addClass = function (value) {
    var args = Array.prototype.slice.call(arguments);
    this.data['class'] = this.sanitizeClasses(this.data['class'].concat(args));
    return this;
  };

  /**
   * Returns whether the requested attribute exists.
   *
   * @param {string} name
   *   An attribute name to check.
   *
   * @return {boolean}
   *   TRUE or FALSE
   */
  Attributes.prototype.exists = function (name) {
    return this.data[name] !== void(0) && this.data[name] !== null;
  };

  /**
   * Retrieve a specific attribute from the array.
   *
   * @param {string} name
   *   The specific attribute to retrieve.
   * @param {*} defaultValue
   *   (optional) The default value to set if the attribute does not exist.
   *
   * @return {*}
   *   A specific attribute value, passed by reference.
   */
  Attributes.prototype.get = function (name, defaultValue) {
    if (!this.exists(name)) this.data[name] = defaultValue;
    return this.data[name];
  };

  /**
   * Retrieves a cloned copy of the internal attributes data object.
   *
   * @return {Object}
   */
  Attributes.prototype.getData = function () {
    return _.extend({}, this.data);
  };

  /**
   * Retrieves classes from the array.
   *
   * @return {Array}
   *   The classes array.
   */
  Attributes.prototype.getClasses = function () {
    return this.get('class', []);
  };

  /**
   * Indicates whether a class is present in the array.
   *
   * @param {string|Array} className
   *   The class(es) to search for.
   *
   * @return {boolean}
   *   TRUE or FALSE
   */
  Attributes.prototype.hasClass = function (className) {
    className = this.sanitizeClasses(Array.prototype.slice.call(arguments));
    var classes = this.getClasses();
    for (var i = 0, l = className.length; i < l; i++) {
      // If one of the classes fails, immediately return false.
      if (_.indexOf(classes, className[i]) === -1) {
        return false;
      }
    }
    return true;
  };

  /**
   * Merges multiple values into the array.
   *
   * @param {Attributes|Node|jQuery|Object} object
   *   An Attributes object with existing data, a Node DOM element, a jQuery
   *   instance or a plain object where the key is the attribute name and the
   *   value is the attribute value.
   * @param {boolean} [recursive]
   *   Flag determining whether or not to recursively merge key/value pairs.
   *
   * @return {Attributes}
   *
   * @chainable
   */
  Attributes.prototype.merge = function (object, recursive) {
    // Immediately return if there is nothing to merge.
    if (!object) {
      return this;
    }

    // Get attributes from a jQuery element.
    if (object instanceof $) {
      object = object[0];
    }

    // Get attributes from a DOM element.
    if (object instanceof Node) {
      object = Array.prototype.slice.call(object.attributes).reduce(function (attributes, attribute) {
        attributes[attribute.name] = attribute.value;
        return attributes;
      }, {});
    }
    // Get attributes from an Attributes instance.
    else if (object instanceof Attributes) {
      object = object.getData();
    }
    // Otherwise, clone the object.
    else {
      object = _.extend({}, object);
    }

    // By this point, there should be a valid plain object.
    if (!$.isPlainObject(object)) {
      setTimeout(function () {
        throw new Error('Passed object is not supported: ' + object);
      });
      return this;
    }

    // Handle classes separately.
    if (object && object['class'] !== void 0) {
      this.addClass(object['class']);
      delete object['class'];
    }

    if (recursive === void 0 || recursive) {
      this.data = $.extend(true, {}, this.data, object);
    }
    else {
      this.data = $.extend({}, this.data, object);
    }

    return this;
  };

  /**
   * Removes an attribute from the array.
   *
   * @param {string} name
   *   The name of the attribute to remove.
   *
   * @return {Attributes}
   *
   * @chainable
   */
  Attributes.prototype.remove = function (name) {
    if (this.exists(name)) delete this.data[name];
    return this;
  };

  /**
   * Removes a class from the attributes array.
   *
   * @param {...string|Array} className
   *   An individual class or an array of classes to remove.
   *
   * @return {Attributes}
   *
   * @chainable
   */
  Attributes.prototype.removeClass = function (className) {
    var remove = this.sanitizeClasses(Array.prototype.slice.apply(arguments));
    this.data['class'] = _.without(this.getClasses(), remove);
    return this;
  };

  /**
   * Replaces a class in the attributes array.
   *
   * @param {string} oldValue
   *   The old class to remove.
   * @param {string} newValue
   *   The new class. It will not be added if the old class does not exist.
   *
   * @return {Attributes}
   *
   * @chainable
   */
  Attributes.prototype.replaceClass = function (oldValue, newValue) {
    var classes = this.getClasses();
    var i = _.indexOf(this.sanitizeClasses(oldValue), classes);
    if (i >= 0) {
      classes[i] = newValue;
      this.set('class', classes);
    }
    return this;
  };

  /**
   * Ensures classes are flattened into a single is an array and sanitized.
   *
   * @param {...String|Array} classes
   *   The class or classes to sanitize.
   *
   * @return {Array}
   *   A sanitized array of classes.
   */
  Attributes.prototype.sanitizeClasses = function (classes) {
    return _.chain(Array.prototype.slice.call(arguments))
      // Flatten in case there's a mix of strings and arrays.
      .flatten()

      // Split classes that may have been added with a space as a separator.
      .map(function (string) {
        return string.split(' ');
      })

      // Flatten again since it was just split into arrays.
      .flatten()

      // Filter out empty items.
      .filter()

      // Clean the class to ensure it's a valid class name.
      .map(function (value) {
        return Attributes.cleanClass(value);
      })

      // Ensure classes are unique.
      .uniq()

      // Retrieve the final value.
      .value();
  };

  /**
   * Sets an attribute on the array.
   *
   * @param {string} name
   *   The name of the attribute to set.
   * @param {*} value
   *   The value of the attribute to set.
   *
   * @return {Attributes}
   *
   * @chainable
   */
  Attributes.prototype.set = function (name, value) {
    var obj = $.isPlainObject(name) ? name : {};
    if (typeof name === 'string') {
      obj[name] = value;
    }
    return this.merge(obj);
  };

  /**
   * Prepares a string for use as a CSS identifier (element, class, or ID name).
   *
   * Note: this is essentially a direct copy from
   * \Drupal\Component\Utility\Html::cleanCssIdentifier
   *
   * @param {string} identifier
   *   The identifier to clean.
   * @param {Object} [filter]
   *   An object of string replacements to use on the identifier.
   *
   * @return {string}
   *   The cleaned identifier.
   */
  Attributes.cleanClass = function (identifier, filter) {
    filter = filter || {
      ' ': '-',
      '_': '-',
      '/': '-',
      '[': '-',
      ']': ''
    };

    identifier = identifier.toLowerCase();

    if (filter['__'] === void 0) {
      identifier = identifier.replace('__', '#DOUBLE_UNDERSCORE#');
    }

    identifier = identifier.replace(Object.keys(filter), Object.keys(filter).map(function(key) { return filter[key]; }));

    if (filter['__'] === void 0) {
      identifier = identifier.replace('#DOUBLE_UNDERSCORE#', '__');
    }

    identifier = identifier.replace(/[^\u002D\u0030-\u0039\u0041-\u005A\u005F\u0061-\u007A\u00A1-\uFFFF]/g, '');
    identifier = identifier.replace(['/^[0-9]/', '/^(-[0-9])|^(--)/'], ['_', '__']);

    return identifier;
  };

  /**
   * Creates an Attributes instance.
   *
   * @param {object|Attributes} [attributes]
   *   An object to initialize attributes with.
   *
   * @return {Attributes}
   *   An Attributes instance.
   *
   * @constructor
   */
  Attributes.create = function (attributes) {
    return new Attributes(attributes);
  };

  window.Attributes = Attributes;

})(window.jQuery, window._);
;
/**
 * @file
 * Theme hooks for the Drupal Bootstrap base theme.
 */
(function ($, Drupal, Bootstrap, Attributes) {

  /**
   * Fallback for theming an icon if the Icon API module is not installed.
   */
  if (!Drupal.icon) Drupal.icon = { bundles: {} };
  if (!Drupal.theme.icon || Drupal.theme.prototype.icon) {
    $.extend(Drupal.theme, /** @lends Drupal.theme */ {
      /**
       * Renders an icon.
       *
       * @param {string} bundle
       *   The bundle which the icon belongs to.
       * @param {string} icon
       *   The name of the icon to render.
       * @param {object|Attributes} [attributes]
       *   An object of attributes to also apply to the icon.
       *
       * @returns {string}
       */
      icon: function (bundle, icon, attributes) {
        if (!Drupal.icon.bundles[bundle]) return '';
        attributes = Attributes.create(attributes).addClass('icon').set('aria-hidden', 'true');
        icon = Drupal.icon.bundles[bundle](icon, attributes);
        return '<span' + attributes + '></span>';
      }
    });
  }

  /**
   * Callback for modifying an icon in the "bootstrap" icon bundle.
   *
   * @param {string} icon
   *   The icon being rendered.
   * @param {Attributes} attributes
   *   Attributes object for the icon.
   */
  Drupal.icon.bundles.bootstrap = function (icon, attributes) {
    attributes.addClass(['glyphicon', 'glyphicon-' + icon]);
  };

  /**
   * Add necessary theming hooks.
   */
  $.extend(Drupal.theme, /** @lends Drupal.theme */ {

    /**
     * Renders a Bootstrap AJAX glyphicon throbber.
     *
     * @returns {string}
     */
    ajaxThrobber: function () {
      return Drupal.theme('bootstrapIcon', 'refresh', {'class': ['ajax-throbber', 'glyphicon-spin'] });
    },

    /**
     * Renders a button element.
     *
     * @param {object|Attributes} attributes
     *   An object of attributes to apply to the button. If it contains one of:
     *   - value: The label of the button.
     *   - context: The context type of Bootstrap button, can be one of:
     *     - default
     *     - primary
     *     - success
     *     - info
     *     - warning
     *     - danger
     *     - link
     *
     * @returns {string}
     */
    button: function (attributes) {
      attributes = Attributes.create(attributes).addClass('btn');
      var context = attributes.get('context', 'default');
      var label = attributes.get('value', '');
      attributes.remove('context').remove('value');
      if (!attributes.hasClass(['btn-default', 'btn-primary', 'btn-success', 'btn-info', 'btn-warning', 'btn-danger', 'btn-link'])) {
        attributes.addClass('btn-' + Bootstrap.checkPlain(context));
      }

      // Attempt to, intelligently, provide a default button "type".
      if (!attributes.exists('type')) {
        attributes.set('type', attributes.hasClass('form-submit') ? 'submit' : 'button');
      }

      return '<button' + attributes + '>' + label + '</button>';
    },

    /**
     * Alias for "button" theme hook.
     *
     * @param {object|Attributes} attributes
     *   An object of attributes to apply to the button.
     *
     * @see Drupal.theme.button()
     *
     * @returns {string}
     */
    btn: function (attributes) {
      return Drupal.theme('button', attributes);
    },

    /**
     * Renders a button block element.
     *
     * @param {object|Attributes} attributes
     *   An object of attributes to apply to the button.
     *
     * @see Drupal.theme.button()
     *
     * @returns {string}
     */
    'btn-block': function (attributes) {
      return Drupal.theme('button', Attributes.create(attributes).addClass('btn-block'));
    },

    /**
     * Renders a large button element.
     *
     * @param {object|Attributes} attributes
     *   An object of attributes to apply to the button.
     *
     * @see Drupal.theme.button()
     *
     * @returns {string}
     */
    'btn-lg': function (attributes) {
      return Drupal.theme('button', Attributes.create(attributes).addClass('btn-lg'));
    },

    /**
     * Renders a small button element.
     *
     * @param {object|Attributes} attributes
     *   An object of attributes to apply to the button.
     *
     * @see Drupal.theme.button()
     *
     * @returns {string}
     */
    'btn-sm': function (attributes) {
      return Drupal.theme('button', Attributes.create(attributes).addClass('btn-sm'));
    },

    /**
     * Renders an extra small button element.
     *
     * @param {object|Attributes} attributes
     *   An object of attributes to apply to the button.
     *
     * @see Drupal.theme.button()
     *
     * @returns {string}
     */
    'btn-xs': function (attributes) {
      return Drupal.theme('button', Attributes.create(attributes).addClass('btn-xs'));
    },

    /**
     * Renders a glyphicon.
     *
     * @param {string} name
     *   The name of the glyphicon.
     * @param {object|Attributes} [attributes]
     *   An object of attributes to apply to the icon.
     *
     * @returns {string}
     */
    bootstrapIcon: function (name, attributes) {
      return Drupal.theme('icon', 'bootstrap', name, attributes);
    }

  });

})(window.jQuery, window.Drupal, window.Drupal.bootstrap, window.Attributes);
;
;
;
jQuery(function(){
    var $body = jQuery('body');
    if($body.hasClass('toolbar-horizontal')){
        //do nothing
    }else{
        initCustomForms();
        initFormPlaceholder();
        initFlexContentColumn();
        initTopHeaderSection();
        initModalVideo();
        initSidebarRelatedContent();
        initHomepageMatchHeight();
        initSTDChartMatchHeight();
        initAboutYou();
        initMenuSidebar();
        initAnchorLinks();
        initSidebarSectionAfter();
    }

    initReminderForm();
    initFAQsection();
    setTimeout(function () {
        initBreadcrumbs();
    },1000);

});


function initAnchorLinks() {

    jQuery('.panel-heading, .nav-tabs, .pager').each(function () {
        jQuery(this).addClass('et_smooth_scroll_disabled');
    });

    //on page load
    setTimeout(function () {
        var $target_hash = window.location.hash;
        if($target_hash){
            var $this_link = jQuery($target_hash),
                has_closest_smooth_scroll_disabled = $this_link.closest( '.et_smooth_scroll_disabled' ).length,
                has_closest_woocommerce_tabs = (  $this_link.closest( '.nav-tabs' ).length ),
                has_closest_eab_cal_link = $this_link.closest( '.eab-shortcode_calendar-navigation-link' ).length,
                has_acomment_reply = $this_link.hasClass( 'acomment-reply' ),
                disable_scroll = has_closest_smooth_scroll_disabled || has_closest_woocommerce_tabs || has_closest_eab_cal_link || has_acomment_reply;

            if(! disable_scroll){
                if( $this_link.length ){
                    pb_custom_smooth_scroll( $this_link, false, 800, 'swing');
                    console.log($target_hash);
                }
            }

            //open accordion on load
            var $accordion_link = jQuery('a[href="'+$target_hash+'"]');
            if( $accordion_link.closest('.panel-heading').length ){
                var az_toggle = $this_link.closest('.az-toggle');
                $accordion_link.click();
                pb_custom_smooth_scroll( az_toggle, false, 800, 'linear' );
            }

            //if element is on accordion
            var $accordion_link_element = jQuery($target_hash);
            if( $accordion_link_element.closest('.az-toggle').length ){
                var az_toggle_element = $this_link.closest('.az-toggle'),
                    $accordion_link_trigger_element = az_toggle_element.find('.panel-title a');
                $accordion_link_trigger_element.click();
                pb_custom_smooth_scroll( az_toggle_element, false, 800, 'linear' );
            }

        }

    },400);


    //on link click
    jQuery( 'a[href*="#"]:not([href="#"])' ).click( function(e) {

        var $this_link = jQuery( this ),
            has_closest_smooth_scroll_disabled = $this_link.closest( '.et_smooth_scroll_disabled' ).length,
            has_closest_woocommerce_tabs = (  $this_link.closest( '.nav-tabs' ).length ),
            has_closest_eab_cal_link = $this_link.closest( '.eab-shortcode_calendar-navigation-link' ).length,
            has_acomment_reply = $this_link.hasClass( 'acomment-reply' ),
            disable_scroll = has_closest_smooth_scroll_disabled || has_closest_woocommerce_tabs || has_closest_eab_cal_link || has_acomment_reply;

        if (location.pathname.replace(/^\//,'') == this.pathname.replace(/^\//,'') && location.hostname == this.hostname && ! disable_scroll) {
            var target = jQuery(this.hash);
            target = target.length ? target : jQuery('[name=' + this.hash.slice(1) +']');
            if (target.length) {
                pb_custom_smooth_scroll( target, false, 800, 'swing');
            }
        }
    });
}

//-----------------------------------------------------
// Sidebar Section After
//-----------------------------------------------------
function initSidebarSectionAfter(){
    var $sidebar_section_after = jQuery('.sidebar-section-after');

    if( $sidebar_section_after.length ){

        $sidebar_section_after.each(function () {
            var $this = jQuery(this),
                $next_sidebar_section = $this.next('.sidebar-section-after-content'),
                $copy_sidebar_section_after = '';

            if( $next_sidebar_section.length ){
                //do nothing
            }else{
                $copy_sidebar_section_after = jQuery('.copy-sidebar-section-after').clone();
                $copy_sidebar_section_after.insertAfter($this).wrap( '<div class="sidebar-section-after-content"></div>' );
            }
        });

    }
}

//======================================================================
// FORMS
//======================================================================
//-----------------------------------------------------
// JCF Init
//-----------------------------------------------------

function initCustomForms(){
    
   /*
    jcf.setOptions('Select', {
        wrapNative: false,
        maxVisibleItems: 8
    });

    jcf.destroyAll("select");
    jcf.replace("select",'Select'); */

    jcf.destroyAll('input[type="checkbox"]');
    jcf.replace('input[type="checkbox"]','Checkbox');

    jcf.destroyAll('input[type="radio"]');
    jcf.replace('input[type="radio"]','Radio');

    jcf.destroyAll('input[type="file"]');
    jcf.replace('input[type="file"]','File');

}

function initReminderForm(){
    jcf.destroyAll('.form-reminder-wrap input[type="checkbox"]');
    jcf.replace('.form-reminder-wrap input[type="checkbox"]','Checkbox');

    jcf.destroyAll('.form-reminder-wrap input[type="radio"]');
    jcf.replace('.form-reminder-wrap input[type="radio"]','Radio');

    jcf.destroyAll('.form-reminder-wrap input[type="file"]');
    jcf.replace('.form-reminder-wrap input[type="file"]','File');

    jQuery('.form-reminder-wrap select').select2();

    jQuery('.form-reminder-wrap #edit-refill-frequency').prepend('<div class="div-label">How often?</div>');
    jQuery('.form-reminder-wrap #edit-test-frequency').prepend('<div class="div-label">How often?</div>');
}

function initFormPlaceholder() {
    //----- homepage
    jQuery('.custom-form-module select[name="you_are"] > option:first-child').text('You are?');
    jQuery('.custom-form-module select[name="your_age_is"] > option:first-child').text('Your age is?');
    jQuery('.custom-form-module select[name="you_are"], .custom-form-module select[name="your_age_is"]').select2();

    jQuery('.custom-form-module select[name="your_partners_are[]"]').select2({
        placeholder: "Your partners?"
    });
    
    //----- faq page
    jQuery('.faq-section .views-exposed-form select[name="field_categories"] > option:first-child').text('-- Select Category --');
    jQuery('.faq-section .views-exposed-form select[name="field_categories"]').select2();
    jQuery('.faq-section .views-exposed-form input[name="search_api_fulltext"]').attr("placeholder", "Search by Keyword (e.g. Disease, Symptoms, etc.)");
}

//======================================================================
// Modules
//======================================================================
//-----------------------------------------------------
// Flex content column
//-----------------------------------------------------
function initFlexContentColumn(){
    jQuery('.flex-content-column').each(function(){
        var $this = jQuery(this);

        $this.wrapInner('<div class="fcc-wrap"><div class="fcc-content"></div></div>');
    });
}


//-----------------------------------------------------
// Top Header Section - Alert
//-----------------------------------------------------
function initTopHeaderSection(){
    jQuery('.top-header-alert-section .az-element.az-alert.alert').each(function () {
        var $this = jQuery(this);
        $this.append('<button type="button" class="close" data-dismiss="alert" aria-label="Close"></button>');
        $this.wrapInner('<div class="alert-container"><div class="alert-container-wrap"></div></div>');
        $this.alert();
    });


}

//-----------------------------------------------------
// Modal Video
//-----------------------------------------------------
function initModalVideo(){
    var $modal_video = jQuery('.modal-video a'),
        $modal_text = jQuery('.modal-text a'),
        $options = {
            type: 'iframe',
            mainClass: 'mfp-fade mfp-modal-video-popup',
            removalDelay: 160,
            preloader: false,
            fixedContentPos: false,
            iframe: {
                markup: '<div class="mfp-iframe-scaler">' +
                '<div class="mfp-close"></div>' +
                '<iframe id="player" class="mfp-iframe" frameborder="0" allowfullscreen allow="autoplay"></iframe>' +
                '</div>', // HTML markup of popup, `mfp-close` will be replaced by the close button
                patterns: {
                    youtube: {
                        index: 'youtube.com',
                        id: 'v=',
                        src: '//www.youtube.com/embed/%id%?autoplay=1&mute=1&rel=0&showinfo=0&enablejsapi=1'
                    },
                    vimeo: {
                        index: 'vimeo.com/',
                        id: '/',
                        src: '//player.vimeo.com/video/%id%?autoplay=1&api=1&mute=1'
                    }
                }
            }
        };

    $modal_video.each(function () {
        var $this = jQuery(this);

        $this.append('<span class="video-play-icon"></span>');

    });

    jQuery(document).on('click', '.modal-video a', function(event) {

        jQuery(this).magnificPopup($options).magnificPopup('open');

        event.preventDefault();
    });

    $modal_text.magnificPopup($options);

}


//-----------------------------------------------------
// Sidebar - Related Content
//-----------------------------------------------------
function initSidebarRelatedContent(){
    jQuery('.related-content-view .views-row').each(function() {
        var $this = jQuery(this);
        $this.append('<div class="view-col-content"></div>');

        var $content = $this.find('.view-col-content'),
            $title = $this.find('.views-field-title'),
            $body = $this.find('.views-field-body'),
            $view_node = $this.find('.views-field-view-node');

        $title.appendTo($content);
        $body.appendTo($content);
        $view_node.appendTo($content);
    });
}

//-----------------------------------------------------
// Breadcrumbs
//-----------------------------------------------------
function initBreadcrumbs(){

    jQuery('.breadcrumb li').each(function () {

        var $this = jQuery(this);
        if(jQuery(this).hasClass('active')){
            //do nothing
        }else{
            if($this.children('.glazed-breadcrumb-spacer').length > 0){
                //do nothing
            }else{
                $this.append('<span class="glazed-breadcrumb-spacer">/</span>');
            }
        }
    });
}

function initHomepageMatchHeight() {

    var options = {
        byRow: true,
        property: 'height',
        target: null,
        remove: false
    };

    jQuery('.home-services-walk-in-hours .bleed-match-height').matchHeight(options);

    jQuery('.blurb-stripe-white-section .az-row .blurb-stripe-white').matchHeight(options);

}

function initFAQsection(){
    Drupal.behaviors.views_infinite_scroll_automatic = {
        attach : function(context, settings) {

            if( jQuery('.faq-section-content').length ){
                jQuery( ".faq-section-content .view.ui-accordion" ).each(function () {
                    var $this = jQuery(this);
                    $this.accordion("refresh");
                });

                setTimeout(function(){
                    jQuery('.faq-section-content .loader-rectangles-wrap').remove();
                },1000);

                initFAQsectionButton();

            }

        }

    };
    initFAQsectionButton();
}

function initFAQsectionButton(){
    jQuery('.faq-section-content .pager li .button').click(function(){
        var $this = jQuery(this),
            $view = $this.closest('.view');
        if( $view.children('.loader-rectangles-wrap').length ){
            //do nothing
        }else{
            $view.append('<div class="loader-rectangles-wrap"><div class="loader-rectangles">Loading...</div></div>');
        }
    });

}

function initSTDChartMatchHeight() {

    var options = {
        byRow: true,
        property: 'height',
        target: null,
        remove: false
    };

    jQuery('.std-chart-table .az-row.td-chart-row-wrap .td-chart-col-wrap').matchHeight(options);

}

function initAboutYou(){

    Drupal.behaviors.AJAX = {
        attach : function(context, settings) {

            if( jQuery('.custom-form-module').length ){
                setTimeout(function(){
                    jQuery('.custom-form-module .loader-rectangles-wrap-container').remove();
                },500);

                initAboutYouButton();
            }

        }

    };

    initAboutYouButton();
    jQuery('.about-you-custom-form-section .custom-form-module #edit-submit-about-you').trigger('click');
    setTimeout(function(){
        if( jQuery('#edit-you-are').val() == 'All' && jQuery('#edit-your-age-is').val() == 'All'  && jQuery('#edit-your-partners-are').val() == '' ){
            jQuery('.view-about-you .view-content').html('');
        }
    },800);
    
}

function initAboutYouButton(){

    jQuery('.custom-form-module .form-actions .button').click(function(){
        var $this = jQuery(this),
            $view = $this.closest('.custom-form-module');
        if( $view.children('.loader-rectangles-wrap-container').length ){
            //do nothing
        }else{
            $view.children('loader-rectangles-wrap-container').remove();
            $view.append('<div class="loader-rectangles-wrap-container"><div class="loader-rectangles-wrap"><div class="loader-rectangles">Loading...</div></div></div>');
        }
    });

}

function initMenuSidebar() {

    jQuery('.sidebar-colored-menu .dropdown.active-trail>a').each(function () {
        jQuery(this).closest('li').addClass('open');
    });
  
}
/*!
 * JavaScript Custom Forms
 *
 * Copyright 2014-2015 PSD2HTML - http://psd2html.com/jcf
 * Released under the MIT license (LICENSE.txt)
 *
 * Version: 1.2.3
 */
!function(e,t){"use strict";"function"==typeof define&&define.amd?define(["jquery"],t):"object"==typeof exports?module.exports=t(require("jquery")):e.jcf=t(jQuery)}(this,function(e){"use strict";var t="1.2.3",n=[],o={optionsKey:"jcf",dataKey:"jcf-instance",rtlClass:"jcf-rtl",focusClass:"jcf-focus",pressedClass:"jcf-pressed",disabledClass:"jcf-disabled",hiddenClass:"jcf-hidden",resetAppearanceClass:"jcf-reset-appearance",unselectableClass:"jcf-unselectable"},a="ontouchstart"in window||window.DocumentTouch&&document instanceof window.DocumentTouch,i=/Windows Phone/.test(navigator.userAgent);o.isMobileDevice=!(!a&&!i);var r=function(){var t=e("<style>").appendTo("head"),n=t.prop("sheet")||t.prop("styleSheet"),a=function(e,t,o){o=o||0,n.insertRule?n.insertRule(e+"{"+t+"}",o):n.addRule(e,t,o)};a("."+o.hiddenClass,"position:absolute !important;left:-9999px !important;height:1px !important;width:1px !important;margin:0 !important;border-width:0 !important;-webkit-appearance:none;-moz-appearance:none;appearance:none"),a("."+o.rtlClass+" ."+o.hiddenClass,"right:-9999px !important; left: auto !important"),a("."+o.unselectableClass,"-webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; -webkit-tap-highlight-color: rgba(0,0,0,0);"),a("."+o.resetAppearanceClass,"background: none; border: none; -webkit-appearance: none; appearance: none; opacity: 0; filter: alpha(opacity=0);");var i=e("html"),r=e("body");"rtl"!==i.css("direction")&&"rtl"!==r.css("direction")||i.addClass(o.rtlClass),i.on("reset",function(){setTimeout(function(){c.refreshAll()},0)}),o.styleSheetCreated=!0};!function(){var t,n=navigator.pointerEnabled||navigator.msPointerEnabled,o="ontouchstart"in window||window.DocumentTouch&&document instanceof window.DocumentTouch,a={},i="jcf-";t=n?{pointerover:navigator.pointerEnabled?"pointerover":"MSPointerOver",pointerdown:navigator.pointerEnabled?"pointerdown":"MSPointerDown",pointermove:navigator.pointerEnabled?"pointermove":"MSPointerMove",pointerup:navigator.pointerEnabled?"pointerup":"MSPointerUp"}:{pointerover:"mouseover",pointerdown:"mousedown"+(o?" touchstart":""),pointermove:"mousemove"+(o?" touchmove":""),pointerup:"mouseup"+(o?" touchend":"")},e.each(t,function(t,n){e.each(n.split(" "),function(e,n){a[n]=t})}),e.each(t,function(t,n){n=n.split(" "),e.event.special[i+t]={setup:function(){var t=this;e.each(n,function(e,n){t.addEventListener?t.addEventListener(n,c,!1):t["on"+n]=c})},teardown:function(){var t=this;e.each(n,function(e,n){t.addEventListener?t.removeEventListener(n,c,!1):t["on"+n]=null})}}});var r=null,s=function(e){var t=Math.abs(e.pageX-r.x),n=Math.abs(e.pageY-r.y),o=25;return o>=t&&o>=n?!0:void 0},c=function(t){var n=t||window.event,o=null,c=a[n.type];if(t=e.event.fix(n),t.type=i+c,n.pointerType)switch(n.pointerType){case 2:t.pointerType="touch";break;case 3:t.pointerType="pen";break;case 4:t.pointerType="mouse";break;default:t.pointerType=n.pointerType}else t.pointerType=n.type.substr(0,5);return t.pageX||t.pageY||(o=n.changedTouches?n.changedTouches[0]:n,t.pageX=o.pageX,t.pageY=o.pageY),"touchend"===n.type&&(r={x:t.pageX,y:t.pageY}),"mouse"===t.pointerType&&r&&s(t)?void 0:(e.event.dispatch||e.event.handle).call(this,t)}}(),function(){var t=("onwheel"in document||document.documentMode>=9?"wheel":"mousewheel DOMMouseScroll").split(" "),n="jcf-mousewheel";e.event.special[n]={setup:function(){var n=this;e.each(t,function(e,t){n.addEventListener?n.addEventListener(t,o,!1):n["on"+t]=o})},teardown:function(){var n=this;e.each(t,function(e,t){n.addEventListener?n.removeEventListener(t,o,!1):n["on"+t]=null})}};var o=function(t){var o=t||window.event;if(t=e.event.fix(o),t.type=n,"detail"in o&&(t.deltaY=-o.detail),"wheelDelta"in o&&(t.deltaY=-o.wheelDelta),"wheelDeltaY"in o&&(t.deltaY=-o.wheelDeltaY),"wheelDeltaX"in o&&(t.deltaX=-o.wheelDeltaX),"deltaY"in o&&(t.deltaY=o.deltaY),"deltaX"in o&&(t.deltaX=o.deltaX),t.delta=t.deltaY||t.deltaX,1===o.deltaMode){var a=16;t.delta*=a,t.deltaY*=a,t.deltaX*=a}return(e.event.dispatch||e.event.handle).call(this,t)}}();var s={fireNativeEvent:function(t,n){e(t).each(function(){var e,t=this;t.dispatchEvent?(e=document.createEvent("HTMLEvents"),e.initEvent(n,!0,!0),t.dispatchEvent(e)):document.createEventObject&&(e=document.createEventObject(),e.target=t,t.fireEvent("on"+n,e))})},bindHandlers:function(){var t=this;e.each(t,function(n,o){0===n.indexOf("on")&&e.isFunction(o)&&(t[n]=function(){return o.apply(t,arguments)})})}},c={version:t,modules:{},getOptions:function(){return e.extend({},o)},setOptions:function(t,n){arguments.length>1?this.modules[t]&&e.extend(this.modules[t].prototype.options,n):e.extend(o,t)},addModule:function(t){e.isFunction(t)&&(t=t(e,window));var a=function(t){t.element.data(o.dataKey)||t.element.data(o.dataKey,this),n.push(this),this.options=e.extend({},o,this.options,i(t.element),t),this.bindHandlers(),this.init.apply(this,arguments)},i=function(t){var n=t.data(o.optionsKey),a=t.attr(o.optionsKey);if(n)return n;if(a)try{return e.parseJSON(a)}catch(i){}};a.prototype=t,e.extend(t,s),t.plugins&&e.each(t.plugins,function(t,n){e.extend(n.prototype,s)});var r=a.prototype.destroy;a.prototype.destroy=function(){this.options.element.removeData(this.options.dataKey);for(var e=n.length-1;e>=0;e--)if(n[e]===this){n.splice(e,1);break}r&&r.apply(this,arguments)},this.modules[t.name]=a},getInstance:function(t){return e(t).data(o.dataKey)},replace:function(t,n,a){var i,s=this;return o.styleSheetCreated||r(),e(t).each(function(){var t,r=e(this);i=r.data(o.dataKey),i?i.refresh():(n||e.each(s.modules,function(e,t){return t.prototype.matchElement.call(t.prototype,r)?(n=e,!1):void 0}),n&&(t=e.extend({element:r},a),i=new s.modules[n](t)))}),i},refresh:function(t){e(t).each(function(){var t=e(this).data(o.dataKey);t&&t.refresh()})},destroy:function(t){e(t).each(function(){var t=e(this).data(o.dataKey);t&&t.destroy()})},replaceAll:function(t){var n=this;e.each(this.modules,function(o,a){e(a.prototype.selector,t).each(function(){this.className.indexOf("jcf-ignore")<0&&n.replace(this,o)})})},refreshAll:function(t){if(t)e.each(this.modules,function(n,a){e(a.prototype.selector,t).each(function(){var t=e(this).data(o.dataKey);t&&t.refresh()})});else for(var a=n.length-1;a>=0;a--)n[a].refresh()},destroyAll:function(t){if(t)e.each(this.modules,function(n,a){e(a.prototype.selector,t).each(function(t,n){var a=e(n).data(o.dataKey);a&&a.destroy()})});else for(;n.length;)n[0].destroy()}};return"function"==typeof define&&define.amd&&(window.jcf=c),c});
/*
 * Custom Smooth Scroll
 *--------------------------*/
(function($){
    window.pb_custom_smooth_scroll = function( $target, $top_section, speed, easing ) {
        var $window_width = $( window ).width();


        var $menu_offset = -1;

        var $scroll_position = $target.offset().top - $menu_offset;


        // set swing (animate's scrollTop default) as default value
        if( typeof easing === 'undefined' ){
            easing = 'swing';
        }

        $( 'html, body' ).animate( { scrollTop :  $scroll_position }, speed, easing );
    }
})(jQuery);
/*!
 * JavaScript Custom Forms : Checkbox Module
 *
 * Copyright 2014-2015 PSD2HTML - http://psd2html.com/jcf
 * Released under the MIT license (LICENSE.txt)
 *
 * Version: 1.2.3
 */
!function(e){e.addModule(function(e){"use strict";return{name:"Checkbox",selector:'input[type="checkbox"]',options:{wrapNative:!0,checkedClass:"jcf-checked",uncheckedClass:"jcf-unchecked",labelActiveClass:"jcf-label-active",fakeStructure:'<span class="jcf-checkbox"><span></span></span>'},matchElement:function(e){return e.is(":checkbox")},init:function(){this.initStructure(),this.attachEvents(),this.refresh()},initStructure:function(){this.doc=e(document),this.realElement=e(this.options.element),this.fakeElement=e(this.options.fakeStructure).insertAfter(this.realElement),this.labelElement=this.getLabelFor(),this.options.wrapNative?this.realElement.appendTo(this.fakeElement).css({position:"absolute",height:"100%",width:"100%",opacity:0,margin:0}):this.realElement.addClass(this.options.hiddenClass)},attachEvents:function(){this.realElement.on({focus:this.onFocus,click:this.onRealClick}),this.fakeElement.on("click",this.onFakeClick),this.fakeElement.on("jcf-pointerdown",this.onPress)},onRealClick:function(e){var t=this;this.savedEventObject=e,setTimeout(function(){t.refresh()},0)},onFakeClick:function(e){this.options.wrapNative&&this.realElement.is(e.target)||this.realElement.is(":disabled")||(delete this.savedEventObject,this.stateChecked=this.realElement.prop("checked"),this.realElement.prop("checked",!this.stateChecked),this.fireNativeEvent(this.realElement,"click"),this.savedEventObject&&this.savedEventObject.isDefaultPrevented()?this.realElement.prop("checked",this.stateChecked):this.fireNativeEvent(this.realElement,"change"),delete this.savedEventObject)},onFocus:function(){this.pressedFlag&&this.focusedFlag||(this.focusedFlag=!0,this.fakeElement.addClass(this.options.focusClass),this.realElement.on("blur",this.onBlur))},onBlur:function(){this.pressedFlag||(this.focusedFlag=!1,this.fakeElement.removeClass(this.options.focusClass),this.realElement.off("blur",this.onBlur))},onPress:function(e){this.focusedFlag||"mouse"!==e.pointerType||this.realElement.focus(),this.pressedFlag=!0,this.fakeElement.addClass(this.options.pressedClass),this.doc.on("jcf-pointerup",this.onRelease)},onRelease:function(e){this.focusedFlag&&"mouse"===e.pointerType&&this.realElement.focus(),this.pressedFlag=!1,this.fakeElement.removeClass(this.options.pressedClass),this.doc.off("jcf-pointerup",this.onRelease)},getLabelFor:function(){var t=this.realElement.closest("label"),s=this.realElement.prop("id");return!t.length&&s&&(t=e('label[for="'+s+'"]')),t.length?t:null},refresh:function(){var e=this.realElement.is(":checked"),t=this.realElement.is(":disabled");this.fakeElement.toggleClass(this.options.checkedClass,e).toggleClass(this.options.uncheckedClass,!e).toggleClass(this.options.disabledClass,t),this.labelElement&&this.labelElement.toggleClass(this.options.labelActiveClass,e)},destroy:function(){this.options.wrapNative?this.realElement.insertBefore(this.fakeElement).css({position:"",width:"",height:"",opacity:"",margin:""}):this.realElement.removeClass(this.options.hiddenClass),this.fakeElement.off("jcf-pointerdown",this.onPress),this.fakeElement.remove(),this.doc.off("jcf-pointerup",this.onRelease),this.realElement.off({focus:this.onFocus,click:this.onRealClick})}}})}(jcf);
/*!
 * JavaScript Custom Forms : File Module
 *
 * Copyright 2014-2016 PSD2HTML - http://psd2html.com/jcf
 * Released under the MIT license (LICENSE.txt)
 *
 * Version: 1.2.3
 */

(function(jcf) {

    jcf.addModule(function($) {
        'use strict';

        return {
            name: 'File',
            selector: 'input[type="file"]',
            options: {
                fakeStructure: '<span class="jcf-file"><span class="jcf-fake-input"></span><span class="jcf-upload-button"><span class="jcf-button-content"></span></span></span>',
                buttonText: 'Choose file',
                placeholderText: 'No file chosen',
                realElementClass: 'jcf-real-element',
                extensionPrefixClass: 'jcf-extension-',
                selectedFileBlock: '.jcf-fake-input',
                buttonTextBlock: '.jcf-button-content'
            },
            matchElement: function(element) {
                return element.is('input[type="file"]');
            },
            init: function() {
                this.initStructure();
                this.attachEvents();
                this.refresh();
            },
            initStructure: function() {
                this.doc = $(document);
                this.realElement = $(this.options.element).addClass(this.options.realElementClass);
                this.fakeElement = $(this.options.fakeStructure).insertBefore(this.realElement);
                this.fileNameBlock = this.fakeElement.find(this.options.selectedFileBlock);
                this.buttonTextBlock = this.fakeElement.find(this.options.buttonTextBlock).text(this.options.buttonText);

                this.realElement.appendTo(this.fakeElement).css({
                    position: 'absolute',
                    opacity: 0
                });
            },
            attachEvents: function() {
                this.realElement.on({
                    'jcf-pointerdown': this.onPress,
                    change: this.onChange,
                    focus: this.onFocus
                });
            },
            onChange: function() {
                this.refresh();
            },
            onFocus: function() {
                this.fakeElement.addClass(this.options.focusClass);
                this.realElement.on('blur', this.onBlur);
            },
            onBlur: function() {
                this.fakeElement.removeClass(this.options.focusClass);
                this.realElement.off('blur', this.onBlur);
            },
            onPress: function() {
                this.fakeElement.addClass(this.options.pressedClass);
                this.doc.on('jcf-pointerup', this.onRelease);
            },
            onRelease: function() {
                this.fakeElement.removeClass(this.options.pressedClass);
                this.doc.off('jcf-pointerup', this.onRelease);
            },
            getFileName: function() {
                var resultFileName = '',
                    files = this.realElement.prop('files');

                if (files && files.length) {
                    $.each(files, function(index, file) {
                        resultFileName += (index > 0 ? ', ' : '') + file.name;
                    });
                } else {
                    resultFileName = this.realElement.val().replace(/^[\s\S]*(?:\\|\/)([\s\S^\\\/]*)$/g, '$1');
                }

                return resultFileName;
            },
            getFileExtension: function() {
                var fileName = this.realElement.val();
                return fileName.lastIndexOf('.') < 0 ? '' : fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
            },
            updateExtensionClass: function() {
                var currentExtension = this.getFileExtension(),
                    currentClassList = this.fakeElement.prop('className'),
                    cleanedClassList = currentClassList.replace(new RegExp('(\\s|^)' + this.options.extensionPrefixClass + '[^ ]+','gi'), '');

                this.fakeElement.prop('className', cleanedClassList);
                if (currentExtension) {
                    this.fakeElement.addClass(this.options.extensionPrefixClass + currentExtension);
                }
            },
            refresh: function() {
                var selectedFileName = this.getFileName() || this.options.placeholderText;
                this.fakeElement.toggleClass(this.options.disabledClass, this.realElement.is(':disabled'));
                this.fileNameBlock.text(selectedFileName);
                this.updateExtensionClass();
            },
            destroy: function() {
                // reset styles and restore element position
                this.realElement.insertBefore(this.fakeElement).removeClass(this.options.realElementClass).css({
                    position: '',
                    opacity: ''
                });
                this.fakeElement.remove();

                // remove event handlers
                this.realElement.off({
                    'jcf-pointerdown': this.onPress,
                    change: this.onChange,
                    focus: this.onFocus,
                    blur: this.onBlur
                });
                this.doc.off('jcf-pointerup', this.onRelease);
            }
        };
    });

}(jcf));
/*!
 * JavaScript Custom Forms : Radio Module
 *
 * Copyright 2014-2016 PSD2HTML - http://psd2html.com/jcf
 * Released under the MIT license (LICENSE.txt)
 *
 * Version: 1.2.3
 */

(function(jcf) {

    jcf.addModule(function($) {
        'use strict';

        return {
            name: 'Radio',
            selector: 'input[type="radio"]',
            options: {
                wrapNative: true,
                checkedClass: 'jcf-checked',
                uncheckedClass: 'jcf-unchecked',
                labelActiveClass: 'jcf-label-active',
                fakeStructure: '<span class="jcf-radio"><span></span></span>'
            },
            matchElement: function(element) {
                return element.is(':radio');
            },
            init: function() {
                this.initStructure();
                this.attachEvents();
                this.refresh();
            },
            initStructure: function() {
                // prepare structure
                this.doc = $(document);
                this.realElement = $(this.options.element);
                this.fakeElement = $(this.options.fakeStructure).insertAfter(this.realElement);
                this.labelElement = this.getLabelFor();

                if (this.options.wrapNative) {
                    // wrap native radio inside fake block
                    this.realElement.prependTo(this.fakeElement).css({
                        position: 'absolute',
                        opacity: 0
                    });
                } else {
                    // just hide native radio
                    this.realElement.addClass(this.options.hiddenClass);
                }
            },
            attachEvents: function() {
                // add event handlers
                this.realElement.on({
                    focus: this.onFocus,
                    click: this.onRealClick
                });
                this.fakeElement.on('click', this.onFakeClick);
                this.fakeElement.on('jcf-pointerdown', this.onPress);
            },
            onRealClick: function(e) {
                // redraw current radio and its group (setTimeout handles click that might be prevented)
                var self = this;
                this.savedEventObject = e;
                setTimeout(function() {
                    self.refreshRadioGroup();
                }, 0);
            },
            onFakeClick: function(e) {
                // skip event if clicked on real element inside wrapper
                if (this.options.wrapNative && this.realElement.is(e.target)) {
                    return;
                }

                // toggle checked class
                if (!this.realElement.is(':disabled')) {
                    delete this.savedEventObject;
                    this.currentActiveRadio = this.getCurrentActiveRadio();
                    this.stateChecked = this.realElement.prop('checked');
                    this.realElement.prop('checked', true);
                    this.fireNativeEvent(this.realElement, 'click');
                    if (this.savedEventObject && this.savedEventObject.isDefaultPrevented()) {
                        this.realElement.prop('checked', this.stateChecked);
                        this.currentActiveRadio.prop('checked', true);
                    } else {
                        this.fireNativeEvent(this.realElement, 'change');
                    }
                    delete this.savedEventObject;
                }
            },
            onFocus: function() {
                if (!this.pressedFlag || !this.focusedFlag) {
                    this.focusedFlag = true;
                    this.fakeElement.addClass(this.options.focusClass);
                    this.realElement.on('blur', this.onBlur);
                }
            },
            onBlur: function() {
                if (!this.pressedFlag) {
                    this.focusedFlag = false;
                    this.fakeElement.removeClass(this.options.focusClass);
                    this.realElement.off('blur', this.onBlur);
                }
            },
            onPress: function(e) {
                if (!this.focusedFlag && e.pointerType === 'mouse') {
                    this.realElement.focus();
                }
                this.pressedFlag = true;
                this.fakeElement.addClass(this.options.pressedClass);
                this.doc.on('jcf-pointerup', this.onRelease);
            },
            onRelease: function(e) {
                if (this.focusedFlag && e.pointerType === 'mouse') {
                    this.realElement.focus();
                }
                this.pressedFlag = false;
                this.fakeElement.removeClass(this.options.pressedClass);
                this.doc.off('jcf-pointerup', this.onRelease);
            },
            getCurrentActiveRadio: function() {
                return this.getRadioGroup(this.realElement).filter(':checked');
            },
            getRadioGroup: function(radio) {
                // find radio group for specified radio button
                var name = radio.attr('name'),
                    parentForm = radio.parents('form');

                if (name) {
                    if (parentForm.length) {
                        return parentForm.find('input[name="' + name + '"]');
                    } else {
                        return $('input[name="' + name + '"]:not(form input)');
                    }
                } else {
                    return radio;
                }
            },
            getLabelFor: function() {
                var parentLabel = this.realElement.closest('label'),
                    elementId = this.realElement.prop('id');

                if (!parentLabel.length && elementId) {
                    parentLabel = $('label[for="' + elementId + '"]');
                }
                return parentLabel.length ? parentLabel : null;
            },
            refreshRadioGroup: function() {
                // redraw current radio and its group
                this.getRadioGroup(this.realElement).each(function() {
                    jcf.refresh(this);
                });
            },
            refresh: function() {
                // redraw current radio button
                var isChecked = this.realElement.is(':checked'),
                    isDisabled = this.realElement.is(':disabled');

                this.fakeElement.toggleClass(this.options.checkedClass, isChecked)
                    .toggleClass(this.options.uncheckedClass, !isChecked)
                    .toggleClass(this.options.disabledClass, isDisabled);

                if (this.labelElement) {
                    this.labelElement.toggleClass(this.options.labelActiveClass, isChecked);
                }
            },
            destroy: function() {
                // restore structure
                if (this.options.wrapNative) {
                    this.realElement.insertBefore(this.fakeElement).css({
                        position: '',
                        width: '',
                        height: '',
                        opacity: '',
                        margin: ''
                    });
                } else {
                    this.realElement.removeClass(this.options.hiddenClass);
                }

                // removing element will also remove its event handlers
                this.fakeElement.off('jcf-pointerdown', this.onPress);
                this.fakeElement.remove();

                // remove other event handlers
                this.doc.off('jcf-pointerup', this.onRelease);
                this.realElement.off({
                    blur: this.onBlur,
                    focus: this.onFocus,
                    click: this.onRealClick
                });
            }
        };
    });

}(jcf));
/*!
 * JavaScript Custom Forms : Select Module
 *
 * Copyright 2014-2015 PSD2HTML - http://psd2html.com/jcf
 * Released under the MIT license (LICENSE.txt)
 *
 * Version: 1.2.3
 */
!function(e){e.addModule(function(t,s){"use strict";function i(e){this.options=t.extend({wrapNative:!0,wrapNativeOnMobile:!0,fakeDropInBody:!0,useCustomScroll:!0,flipDropToFit:!0,maxVisibleItems:10,fakeAreaStructure:'<span class="jcf-select"><span class="jcf-select-text"></span><span class="jcf-select-opener"></span></span>',fakeDropStructure:'<div class="jcf-select-drop"><div class="jcf-select-drop-content"></div></div>',optionClassPrefix:"jcf-option-",selectClassPrefix:"jcf-select-",dropContentSelector:".jcf-select-drop-content",selectTextSelector:".jcf-select-text",dropActiveClass:"jcf-drop-active",flipDropClass:"jcf-drop-flipped"},e),this.init()}function o(e){this.options=t.extend({wrapNative:!0,useCustomScroll:!0,fakeStructure:'<span class="jcf-list-box"><span class="jcf-list-wrapper"></span></span>',selectClassPrefix:"jcf-select-",listHolder:".jcf-list-wrapper"},e),this.init()}function n(e){this.options=t.extend({holder:null,maxVisibleItems:10,selectOnClick:!0,useHoverClass:!1,useCustomScroll:!1,handleResize:!0,multipleSelectWithoutKey:!1,alwaysPreventMouseWheel:!1,indexAttribute:"data-index",cloneClassPrefix:"jcf-option-",containerStructure:'<span class="jcf-list"><span class="jcf-list-content"></span></span>',containerSelector:".jcf-list-content",captionClass:"jcf-optgroup-caption",disabledClass:"jcf-disabled",optionClass:"jcf-option",groupClass:"jcf-optgroup",hoverClass:"jcf-hover",selectedClass:"jcf-selected",scrollClass:"jcf-scroll-active"},e),this.init()}var l={name:"Select",selector:"select",options:{element:null,multipleCompactStyle:!1},plugins:{ListBox:o,ComboBox:i,SelectList:n},matchElement:function(e){return e.is("select")},init:function(){this.element=t(this.options.element),this.createInstance()},isListBox:function(){return this.element.is("[size]:not([jcf-size]), [multiple]")},createInstance:function(){this.instance&&this.instance.destroy(),this.isListBox()&&!this.options.multipleCompactStyle?this.instance=new o(this.options):this.instance=new i(this.options)},refresh:function(){var e=this.isListBox()&&this.instance instanceof i||!this.isListBox()&&this.instance instanceof o;e?this.createInstance():this.instance.refresh()},destroy:function(){this.instance.destroy()}};t.extend(i.prototype,{init:function(){this.initStructure(),this.bindHandlers(),this.attachEvents(),this.refresh()},initStructure:function(){this.win=t(s),this.doc=t(document),this.realElement=t(this.options.element),this.fakeElement=t(this.options.fakeAreaStructure).insertAfter(this.realElement),this.selectTextContainer=this.fakeElement.find(this.options.selectTextSelector),this.selectText=t("<span></span>").appendTo(this.selectTextContainer),h(this.fakeElement),this.fakeElement.addClass(r(this.realElement.prop("className"),this.options.selectClassPrefix)),this.realElement.prop("multiple")&&this.fakeElement.addClass("jcf-compact-multiple"),this.options.isMobileDevice&&this.options.wrapNativeOnMobile&&!this.options.wrapNative&&(this.options.wrapNative=!0),this.options.wrapNative?this.realElement.prependTo(this.fakeElement).css({position:"absolute",height:"100%",width:"100%"}).addClass(this.options.resetAppearanceClass):(this.realElement.addClass(this.options.hiddenClass),this.fakeElement.attr("title",this.realElement.attr("title")),this.fakeDropTarget=this.options.fakeDropInBody?t("body"):this.fakeElement)},attachEvents:function(){var e=this;this.delayedRefresh=function(){setTimeout(function(){e.refresh(),e.list&&(e.list.refresh(),e.list.scrollToActiveOption())},1)},this.options.wrapNative?this.realElement.on({focus:this.onFocus,change:this.onChange,click:this.onChange,keydown:this.delayedRefresh}):(this.realElement.on({focus:this.onFocus,change:this.onChange,keydown:this.onKeyDown}),this.fakeElement.on({"jcf-pointerdown":this.onSelectAreaPress}))},onKeyDown:function(e){13===e.which?this.toggleDropdown():this.dropActive&&this.delayedRefresh()},onChange:function(){this.refresh()},onFocus:function(){this.pressedFlag&&this.focusedFlag||(this.fakeElement.addClass(this.options.focusClass),this.realElement.on("blur",this.onBlur),this.toggleListMode(!0),this.focusedFlag=!0)},onBlur:function(){this.pressedFlag||(this.fakeElement.removeClass(this.options.focusClass),this.realElement.off("blur",this.onBlur),this.toggleListMode(!1),this.focusedFlag=!1)},onResize:function(){this.dropActive&&this.hideDropdown()},onSelectDropPress:function(){this.pressedFlag=!0},onSelectDropRelease:function(e,t){this.pressedFlag=!1,"mouse"===t.pointerType&&this.realElement.focus()},onSelectAreaPress:function(e){var s=!this.options.fakeDropInBody&&t(e.target).closest(this.dropdown).length;s||e.button>1||this.realElement.is(":disabled")||(this.selectOpenedByEvent=e.pointerType,this.toggleDropdown(),this.focusedFlag||("mouse"===e.pointerType?this.realElement.focus():this.onFocus(e)),this.pressedFlag=!0,this.fakeElement.addClass(this.options.pressedClass),this.doc.on("jcf-pointerup",this.onSelectAreaRelease))},onSelectAreaRelease:function(e){this.focusedFlag&&"mouse"===e.pointerType&&this.realElement.focus(),this.pressedFlag=!1,this.fakeElement.removeClass(this.options.pressedClass),this.doc.off("jcf-pointerup",this.onSelectAreaRelease)},onOutsideClick:function(e){var s=t(e.target),i=s.closest(this.fakeElement).length||s.closest(this.dropdown).length;i||this.hideDropdown()},onSelect:function(){this.refresh(),this.realElement.prop("multiple")?this.repositionDropdown():this.hideDropdown(),this.fireNativeEvent(this.realElement,"change")},toggleListMode:function(e){this.options.wrapNative||(e?this.realElement.attr({size:4,"jcf-size":""}):this.options.wrapNative||this.realElement.removeAttr("size jcf-size"))},createDropdown:function(){this.dropdown&&(this.list.destroy(),this.dropdown.remove()),this.dropdown=t(this.options.fakeDropStructure).appendTo(this.fakeDropTarget),this.dropdown.addClass(r(this.realElement.prop("className"),this.options.selectClassPrefix)),h(this.dropdown),this.realElement.prop("multiple")&&this.dropdown.addClass("jcf-compact-multiple"),this.options.fakeDropInBody&&this.dropdown.css({position:"absolute",top:-9999}),this.list=new n({useHoverClass:!0,handleResize:!1,alwaysPreventMouseWheel:!0,maxVisibleItems:this.options.maxVisibleItems,useCustomScroll:this.options.useCustomScroll,holder:this.dropdown.find(this.options.dropContentSelector),multipleSelectWithoutKey:this.realElement.prop("multiple"),element:this.realElement}),t(this.list).on({select:this.onSelect,press:this.onSelectDropPress,release:this.onSelectDropRelease})},repositionDropdown:function(){var e,t,s,i=this.fakeElement.offset(),o=this.fakeElement[0].getBoundingClientRect(),n=o.width||o.right-o.left,l=this.fakeElement.outerHeight(),r=this.dropdown.css("width",n).outerHeight(),h=this.win.scrollTop(),a=this.win.height(),c=!1;i.top+l+r>h+a&&i.top-r>h&&(c=!0),this.options.fakeDropInBody&&(s="static"!==this.fakeDropTarget.css("position")?this.fakeDropTarget.offset().top:0,this.options.flipDropToFit&&c?(t=i.left,e=i.top-r-s):(t=i.left,e=i.top+l-s),this.dropdown.css({width:n,left:t,top:e})),this.dropdown.add(this.fakeElement).toggleClass(this.options.flipDropClass,this.options.flipDropToFit&&c)},showDropdown:function(){this.realElement.prop("options").length&&(this.dropdown||this.createDropdown(),this.dropActive=!0,this.dropdown.appendTo(this.fakeDropTarget),this.fakeElement.addClass(this.options.dropActiveClass),this.refreshSelectedText(),this.repositionDropdown(),this.list.setScrollTop(this.savedScrollTop),this.list.refresh(),this.win.on("resize",this.onResize),this.doc.on("jcf-pointerdown",this.onOutsideClick))},hideDropdown:function(){this.dropdown&&(this.savedScrollTop=this.list.getScrollTop(),this.fakeElement.removeClass(this.options.dropActiveClass+" "+this.options.flipDropClass),this.dropdown.removeClass(this.options.flipDropClass).detach(),this.doc.off("jcf-pointerdown",this.onOutsideClick),this.win.off("resize",this.onResize),this.dropActive=!1,"touch"===this.selectOpenedByEvent&&this.onBlur())},toggleDropdown:function(){this.dropActive?this.hideDropdown():this.showDropdown()},refreshSelectedText:function(){var e,s=this.realElement.prop("selectedIndex"),i=this.realElement.prop("options")[s],o=i?i.getAttribute("data-image"):null,n="",l=this;this.realElement.prop("multiple")?(t.each(this.realElement.prop("options"),function(e,t){t.selected&&(n+=(n?", ":"")+t.innerHTML)}),n||(n=l.realElement.attr("placeholder")||""),this.selectText.removeAttr("class").html(n)):i?this.currentSelectedText===i.innerHTML&&this.currentSelectedImage===o||(e=r(i.className,this.options.optionClassPrefix),this.selectText.attr("class",e).html(i.innerHTML),o?(this.selectImage||(this.selectImage=t("<img>").prependTo(this.selectTextContainer).hide()),this.selectImage.attr("src",o).show()):this.selectImage&&this.selectImage.hide(),this.currentSelectedText=i.innerHTML,this.currentSelectedImage=o):(this.selectImage&&this.selectImage.hide(),this.selectText.removeAttr("class").empty())},refresh:function(){"none"===this.realElement.prop("style").display?this.fakeElement.hide():this.fakeElement.show(),this.refreshSelectedText(),this.fakeElement.toggleClass(this.options.disabledClass,this.realElement.is(":disabled"))},destroy:function(){this.options.wrapNative?this.realElement.insertBefore(this.fakeElement).css({position:"",height:"",width:""}).removeClass(this.options.resetAppearanceClass):(this.realElement.removeClass(this.options.hiddenClass),this.realElement.is("[jcf-size]")&&this.realElement.removeAttr("size jcf-size")),this.fakeElement.remove(),this.doc.off("jcf-pointerup",this.onSelectAreaRelease),this.realElement.off({focus:this.onFocus})}}),t.extend(o.prototype,{init:function(){this.bindHandlers(),this.initStructure(),this.attachEvents()},initStructure:function(){this.realElement=t(this.options.element),this.fakeElement=t(this.options.fakeStructure).insertAfter(this.realElement),this.listHolder=this.fakeElement.find(this.options.listHolder),h(this.fakeElement),this.fakeElement.addClass(r(this.realElement.prop("className"),this.options.selectClassPrefix)),this.realElement.addClass(this.options.hiddenClass),this.list=new n({useCustomScroll:this.options.useCustomScroll,holder:this.listHolder,selectOnClick:!1,element:this.realElement})},attachEvents:function(){var e=this;this.delayedRefresh=function(t){t&&(16===t.which||t.ctrlKey||t.metaKey||t.altKey)||(clearTimeout(e.refreshTimer),e.refreshTimer=setTimeout(function(){e.refresh(),e.list.scrollToActiveOption()},1))},this.realElement.on({focus:this.onFocus,click:this.delayedRefresh,keydown:this.delayedRefresh}),t(this.list).on({select:this.onSelect,press:this.onFakeOptionsPress,release:this.onFakeOptionsRelease})},onFakeOptionsPress:function(e,t){this.pressedFlag=!0,"mouse"===t.pointerType&&this.realElement.focus()},onFakeOptionsRelease:function(e,t){this.pressedFlag=!1,"mouse"===t.pointerType&&this.realElement.focus()},onSelect:function(){this.fireNativeEvent(this.realElement,"change"),this.fireNativeEvent(this.realElement,"click")},onFocus:function(){this.pressedFlag&&this.focusedFlag||(this.fakeElement.addClass(this.options.focusClass),this.realElement.on("blur",this.onBlur),this.focusedFlag=!0)},onBlur:function(){this.pressedFlag||(this.fakeElement.removeClass(this.options.focusClass),this.realElement.off("blur",this.onBlur),this.focusedFlag=!1)},refresh:function(){this.fakeElement.toggleClass(this.options.disabledClass,this.realElement.is(":disabled")),this.list.refresh()},destroy:function(){this.list.destroy(),this.realElement.insertBefore(this.fakeElement).removeClass(this.options.hiddenClass),this.fakeElement.remove()}}),t.extend(n.prototype,{init:function(){this.initStructure(),this.refreshSelectedClass(),this.attachEvents()},initStructure:function(){this.element=t(this.options.element),this.indexSelector="["+this.options.indexAttribute+"]",this.container=t(this.options.containerStructure).appendTo(this.options.holder),this.listHolder=this.container.find(this.options.containerSelector),this.lastClickedIndex=this.element.prop("selectedIndex"),this.rebuildList(),this.element.prop("multiple")&&(this.previousSelection=this.getSelectedOptionsIndexes())},attachEvents:function(){this.bindHandlers(),this.listHolder.on("jcf-pointerdown",this.indexSelector,this.onItemPress),this.listHolder.on("jcf-pointerdown",this.onPress),this.options.useHoverClass&&this.listHolder.on("jcf-pointerover",this.indexSelector,this.onHoverItem)},onPress:function(e){t(this).trigger("press",e),this.listHolder.on("jcf-pointerup",this.onRelease)},onRelease:function(e){t(this).trigger("release",e),this.listHolder.off("jcf-pointerup",this.onRelease)},onHoverItem:function(e){var t=parseFloat(e.currentTarget.getAttribute(this.options.indexAttribute));this.fakeOptions.removeClass(this.options.hoverClass).eq(t).addClass(this.options.hoverClass)},onItemPress:function(e){"touch"===e.pointerType||this.options.selectOnClick?(this.tmpListOffsetTop=this.list.offset().top,this.listHolder.on("jcf-pointerup",this.indexSelector,this.onItemRelease)):this.onSelectItem(e)},onItemRelease:function(e){this.listHolder.off("jcf-pointerup",this.indexSelector,this.onItemRelease),this.tmpListOffsetTop===this.list.offset().top&&this.listHolder.on("click",this.indexSelector,{savedPointerType:e.pointerType},this.onSelectItem),delete this.tmpListOffsetTop},onSelectItem:function(e){var s,i=parseFloat(e.currentTarget.getAttribute(this.options.indexAttribute)),o=e.data&&e.data.savedPointerType||e.pointerType||"mouse";this.listHolder.off("click",this.indexSelector,this.onSelectItem),e.button>1||this.realOptions[i].disabled||(this.element.prop("multiple")?e.metaKey||e.ctrlKey||"touch"===o||this.options.multipleSelectWithoutKey?this.realOptions[i].selected=!this.realOptions[i].selected:e.shiftKey?(s=[this.lastClickedIndex,i].sort(function(e,t){return e-t}),this.realOptions.each(function(e,t){t.selected=e>=s[0]&&e<=s[1]})):this.element.prop("selectedIndex",i):this.element.prop("selectedIndex",i),e.shiftKey||(this.lastClickedIndex=i),this.refreshSelectedClass(),"mouse"===o&&this.scrollToActiveOption(),t(this).trigger("select"))},rebuildList:function(){var s=this,i=this.element[0];this.storedSelectHTML=i.innerHTML,this.optionIndex=0,this.list=t(this.createOptionsList(i)),this.listHolder.empty().append(this.list),this.realOptions=this.element.find("option"),this.fakeOptions=this.list.find(this.indexSelector),this.fakeListItems=this.list.find("."+this.options.captionClass+","+this.indexSelector),delete this.optionIndex;var o=this.options.maxVisibleItems,n=this.element.prop("size");n>1&&!this.element.is("[jcf-size]")&&(o=n);var l=this.fakeOptions.length>o;return this.container.toggleClass(this.options.scrollClass,l),l&&(this.listHolder.css({maxHeight:this.getOverflowHeight(o),overflow:"auto"}),this.options.useCustomScroll&&e.modules.Scrollable)?void e.replace(this.listHolder,"Scrollable",{handleResize:this.options.handleResize,alwaysPreventMouseWheel:this.options.alwaysPreventMouseWheel}):void(this.options.alwaysPreventMouseWheel&&(this.preventWheelHandler=function(e){var t=s.listHolder.scrollTop(),i=s.listHolder.prop("scrollHeight")-s.listHolder.innerHeight();(0>=t&&e.deltaY<0||t>=i&&e.deltaY>0)&&e.preventDefault()},this.listHolder.on("jcf-mousewheel",this.preventWheelHandler)))},refreshSelectedClass:function(){var e,t=this,s=this.element.prop("multiple"),i=this.element.prop("selectedIndex");s?this.realOptions.each(function(e,s){t.fakeOptions.eq(e).toggleClass(t.options.selectedClass,!!s.selected)}):(this.fakeOptions.removeClass(this.options.selectedClass+" "+this.options.hoverClass),e=this.fakeOptions.eq(i).addClass(this.options.selectedClass),this.options.useHoverClass&&e.addClass(this.options.hoverClass))},scrollToActiveOption:function(){var e=this.getActiveOptionOffset();"number"==typeof e&&this.listHolder.prop("scrollTop",e)},getSelectedOptionsIndexes:function(){var e=[];return this.realOptions.each(function(t,s){s.selected&&e.push(t)}),e},getChangedSelectedIndex:function(){var e=this.element.prop("selectedIndex"),s=this,i=!1,o=null;return this.element.prop("multiple")?(this.currentSelection=this.getSelectedOptionsIndexes(),t.each(this.currentSelection,function(e,t){!i&&s.previousSelection.indexOf(t)<0&&(0===e&&(i=!0),o=t)}),this.previousSelection=this.currentSelection,o):e},getActiveOptionOffset:function(){var e=this.getChangedSelectedIndex();if(null!==e){var t=this.listHolder.height(),s=this.listHolder.prop("scrollTop"),i=this.fakeOptions.eq(e),o=i.offset().top-this.list.offset().top,n=i.innerHeight();return o+n>=s+t?o-t+n:s>o?o:void 0}},getOverflowHeight:function(e){var t=this.fakeListItems.eq(e-1),s=this.list.offset().top,i=t.offset().top,o=t.innerHeight();return i+o-s},getScrollTop:function(){return this.listHolder.scrollTop()},setScrollTop:function(e){this.listHolder.scrollTop(e)},createOption:function(e){var t=document.createElement("span");t.className=this.options.optionClass,t.innerHTML=e.innerHTML,t.setAttribute(this.options.indexAttribute,this.optionIndex++);var s,i=e.getAttribute("data-image");return i&&(s=document.createElement("img"),s.src=i,t.insertBefore(s,t.childNodes[0])),e.disabled&&(t.className+=" "+this.options.disabledClass),e.className&&(t.className+=" "+r(e.className,this.options.cloneClassPrefix)),t},createOptGroup:function(e){var t,s,i=document.createElement("span"),o=e.getAttribute("label");return t=document.createElement("span"),t.className=this.options.captionClass,t.innerHTML=o,i.appendChild(t),e.children.length&&(s=this.createOptionsList(e),i.appendChild(s)),i.className=this.options.groupClass,i},createOptionContainer:function(){var e=document.createElement("li");return e},createOptionsList:function(e){var s=this,i=document.createElement("ul");return t.each(e.children,function(e,t){var o,n=s.createOptionContainer(t);switch(t.tagName.toLowerCase()){case"option":o=s.createOption(t);break;case"optgroup":o=s.createOptGroup(t)}i.appendChild(n).appendChild(o)}),i},refresh:function(){this.storedSelectHTML!==this.element.prop("innerHTML")&&this.rebuildList();var t=e.getInstance(this.listHolder);t&&t.refresh(),this.refreshSelectedClass()},destroy:function(){this.listHolder.off("jcf-mousewheel",this.preventWheelHandler),this.listHolder.off("jcf-pointerdown",this.indexSelector,this.onSelectItem),this.listHolder.off("jcf-pointerover",this.indexSelector,this.onHoverItem),this.listHolder.off("jcf-pointerdown",this.onPress)}});var r=function(e,t){return e?e.replace(/[\s]*([\S]+)+[\s]*/gi,t+"$1 "):""},h=function(){function t(e){e.preventDefault()}var s=e.getOptions().unselectableClass;return function(e){e.addClass(s).on("selectstart",t)}}();return l})}(jcf);
/*! Magnific Popup - v1.1.0 - 2016-02-20
 * http://dimsemenov.com/plugins/magnific-popup/
 * Copyright (c) 2016 Dmitry Semenov; */
;(function (factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        // Node/CommonJS
        factory(require('jquery'));
    } else {
        // Browser globals
        factory(window.jQuery || window.Zepto);
    }
}(function($) {

    /*>>core*/
    /**
     *
     * Magnific Popup Core JS file
     *
     */


    /**
     * Private static constants
     */
    var CLOSE_EVENT = 'Close',
        BEFORE_CLOSE_EVENT = 'BeforeClose',
        AFTER_CLOSE_EVENT = 'AfterClose',
        BEFORE_APPEND_EVENT = 'BeforeAppend',
        MARKUP_PARSE_EVENT = 'MarkupParse',
        OPEN_EVENT = 'Open',
        CHANGE_EVENT = 'Change',
        NS = 'mfp',
        EVENT_NS = '.' + NS,
        READY_CLASS = 'mfp-ready',
        REMOVING_CLASS = 'mfp-removing',
        PREVENT_CLOSE_CLASS = 'mfp-prevent-close';


    /**
     * Private vars
     */
    /*jshint -W079 */
    var mfp, // As we have only one instance of MagnificPopup object, we define it locally to not to use 'this'
        MagnificPopup = function(){},
        _isJQ = !!(window.jQuery),
        _prevStatus,
        _window = $(window),
        _document,
        _prevContentType,
        _wrapClasses,
        _currPopupType;


    /**
     * Private functions
     */
    var _mfpOn = function(name, f) {
            mfp.ev.on(NS + name + EVENT_NS, f);
        },
        _getEl = function(className, appendTo, html, raw) {
            var el = document.createElement('div');
            el.className = 'mfp-'+className;
            if(html) {
                el.innerHTML = html;
            }
            if(!raw) {
                el = $(el);
                if(appendTo) {
                    el.appendTo(appendTo);
                }
            } else if(appendTo) {
                appendTo.appendChild(el);
            }
            return el;
        },
        _mfpTrigger = function(e, data) {
            mfp.ev.triggerHandler(NS + e, data);

            if(mfp.st.callbacks) {
                // converts "mfpEventName" to "eventName" callback and triggers it if it's present
                e = e.charAt(0).toLowerCase() + e.slice(1);
                if(mfp.st.callbacks[e]) {
                    mfp.st.callbacks[e].apply(mfp, $.isArray(data) ? data : [data]);
                }
            }
        },
        _getCloseBtn = function(type) {
            if(type !== _currPopupType || !mfp.currTemplate.closeBtn) {
                mfp.currTemplate.closeBtn = $( mfp.st.closeMarkup.replace('%title%', mfp.st.tClose ) );
                _currPopupType = type;
            }
            return mfp.currTemplate.closeBtn;
        },
    // Initialize Magnific Popup only when called at least once
        _checkInstance = function() {
            if(!$.magnificPopup.instance) {
                /*jshint -W020 */
                mfp = new MagnificPopup();
                mfp.init();
                $.magnificPopup.instance = mfp;
            }
        },
    // CSS transition detection, http://stackoverflow.com/questions/7264899/detect-css-transitions-using-javascript-and-without-modernizr
        supportsTransitions = function() {
            var s = document.createElement('p').style, // 's' for style. better to create an element if body yet to exist
                v = ['ms','O','Moz','Webkit']; // 'v' for vendor

            if( s['transition'] !== undefined ) {
                return true;
            }

            while( v.length ) {
                if( v.pop() + 'Transition' in s ) {
                    return true;
                }
            }

            return false;
        };



    /**
     * Public functions
     */
    MagnificPopup.prototype = {

        constructor: MagnificPopup,

        /**
         * Initializes Magnific Popup plugin.
         * This function is triggered only once when $.fn.magnificPopup or $.magnificPopup is executed
         */
        init: function() {
            var appVersion = navigator.appVersion;
            mfp.isLowIE = mfp.isIE8 = document.all && !document.addEventListener;
            mfp.isAndroid = (/android/gi).test(appVersion);
            mfp.isIOS = (/iphone|ipad|ipod/gi).test(appVersion);
            mfp.supportsTransition = supportsTransitions();

            // We disable fixed positioned lightbox on devices that don't handle it nicely.
            // If you know a better way of detecting this - let me know.
            mfp.probablyMobile = (mfp.isAndroid || mfp.isIOS || /(Opera Mini)|Kindle|webOS|BlackBerry|(Opera Mobi)|(Windows Phone)|IEMobile/i.test(navigator.userAgent) );
            _document = $(document);

            mfp.popupsCache = {};
        },

        /**
         * Opens popup
         * @param  data [description]
         */
        open: function(data) {

            var i;

            if(data.isObj === false) {
                // convert jQuery collection to array to avoid conflicts later
                mfp.items = data.items.toArray();

                mfp.index = 0;
                var items = data.items,
                    item;
                for(i = 0; i < items.length; i++) {
                    item = items[i];
                    if(item.parsed) {
                        item = item.el[0];
                    }
                    if(item === data.el[0]) {
                        mfp.index = i;
                        break;
                    }
                }
            } else {
                mfp.items = $.isArray(data.items) ? data.items : [data.items];
                mfp.index = data.index || 0;
            }

            // if popup is already opened - we just update the content
            if(mfp.isOpen) {
                mfp.updateItemHTML();
                return;
            }

            mfp.types = [];
            _wrapClasses = '';
            if(data.mainEl && data.mainEl.length) {
                mfp.ev = data.mainEl.eq(0);
            } else {
                mfp.ev = _document;
            }

            if(data.key) {
                if(!mfp.popupsCache[data.key]) {
                    mfp.popupsCache[data.key] = {};
                }
                mfp.currTemplate = mfp.popupsCache[data.key];
            } else {
                mfp.currTemplate = {};
            }



            mfp.st = $.extend(true, {}, $.magnificPopup.defaults, data );
            mfp.fixedContentPos = mfp.st.fixedContentPos === 'auto' ? !mfp.probablyMobile : mfp.st.fixedContentPos;

            if(mfp.st.modal) {
                mfp.st.closeOnContentClick = false;
                mfp.st.closeOnBgClick = false;
                mfp.st.showCloseBtn = false;
                mfp.st.enableEscapeKey = false;
            }


            // Building markup
            // main containers are created only once
            if(!mfp.bgOverlay) {

                // Dark overlay
                mfp.bgOverlay = _getEl('bg').on('click'+EVENT_NS, function() {
                    mfp.close();
                });

                mfp.wrap = _getEl('wrap').attr('tabindex', -1).on('click'+EVENT_NS, function(e) {
                    if(mfp._checkIfClose(e.target)) {
                        mfp.close();
                    }
                });

                mfp.container = _getEl('container', mfp.wrap);
            }

            mfp.contentContainer = _getEl('content');
            if(mfp.st.preloader) {
                mfp.preloader = _getEl('preloader', mfp.container, mfp.st.tLoading);
            }


            // Initializing modules
            var modules = $.magnificPopup.modules;
            for(i = 0; i < modules.length; i++) {
                var n = modules[i];
                n = n.charAt(0).toUpperCase() + n.slice(1);
                mfp['init'+n].call(mfp);
            }
            _mfpTrigger('BeforeOpen');


            if(mfp.st.showCloseBtn) {
                // Close button
                if(!mfp.st.closeBtnInside) {
                    mfp.wrap.append( _getCloseBtn() );
                } else {
                    _mfpOn(MARKUP_PARSE_EVENT, function(e, template, values, item) {
                        values.close_replaceWith = _getCloseBtn(item.type);
                    });
                    _wrapClasses += ' mfp-close-btn-in';
                }
            }

            if(mfp.st.alignTop) {
                _wrapClasses += ' mfp-align-top';
            }



            if(mfp.fixedContentPos) {
                mfp.wrap.css({
                    overflow: mfp.st.overflowY,
                    overflowX: 'hidden',
                    overflowY: mfp.st.overflowY
                });
            } else {
                mfp.wrap.css({
                    top: _window.scrollTop(),
                    position: 'absolute'
                });
            }
            if( mfp.st.fixedBgPos === false || (mfp.st.fixedBgPos === 'auto' && !mfp.fixedContentPos) ) {
                mfp.bgOverlay.css({
                    height: _document.height(),
                    position: 'absolute'
                });
            }



            if(mfp.st.enableEscapeKey) {
                // Close on ESC key
                _document.on('keyup' + EVENT_NS, function(e) {
                    if(e.keyCode === 27) {
                        mfp.close();
                    }
                });
            }

            _window.on('resize' + EVENT_NS, function() {
                mfp.updateSize();
            });


            if(!mfp.st.closeOnContentClick) {
                _wrapClasses += ' mfp-auto-cursor';
            }

            if(_wrapClasses)
                mfp.wrap.addClass(_wrapClasses);


            // this triggers recalculation of layout, so we get it once to not to trigger twice
            var windowHeight = mfp.wH = _window.height();


            var windowStyles = {};

            if( mfp.fixedContentPos ) {
                if(mfp._hasScrollBar(windowHeight)){
                    var s = mfp._getScrollbarSize();
                    if(s) {
                        windowStyles.marginRight = s;
                    }
                }
            }

            if(mfp.fixedContentPos) {
                if(!mfp.isIE7) {
                    windowStyles.overflow = 'hidden';
                } else {
                    // ie7 double-scroll bug
                    $('body, html').css('overflow', 'hidden');
                }
            }



            var classesToadd = mfp.st.mainClass;
            if(mfp.isIE7) {
                classesToadd += ' mfp-ie7';
            }
            if(classesToadd) {
                mfp._addClassToMFP( classesToadd );
            }

            // add content
            mfp.updateItemHTML();

            _mfpTrigger('BuildControls');

            // remove scrollbar, add margin e.t.c
            $('html').css(windowStyles);

            // add everything to DOM
            mfp.bgOverlay.add(mfp.wrap).prependTo( mfp.st.prependTo || $(document.body) );

            // Save last focused element
            mfp._lastFocusedEl = document.activeElement;

            // Wait for next cycle to allow CSS transition
            setTimeout(function() {

                if(mfp.content) {
                    mfp._addClassToMFP(READY_CLASS);
                    mfp._setFocus();
                } else {
                    // if content is not defined (not loaded e.t.c) we add class only for BG
                    mfp.bgOverlay.addClass(READY_CLASS);
                }

                // Trap the focus in popup
                _document.on('focusin' + EVENT_NS, mfp._onFocusIn);

            }, 16);

            mfp.isOpen = true;
            mfp.updateSize(windowHeight);
            _mfpTrigger(OPEN_EVENT);

            return data;
        },

        /**
         * Closes the popup
         */
        close: function() {
            if(!mfp.isOpen) return;
            _mfpTrigger(BEFORE_CLOSE_EVENT);

            mfp.isOpen = false;
            // for CSS3 animation
            if(mfp.st.removalDelay && !mfp.isLowIE && mfp.supportsTransition )  {
                mfp._addClassToMFP(REMOVING_CLASS);
                setTimeout(function() {
                    mfp._close();
                }, mfp.st.removalDelay);
            } else {
                mfp._close();
            }
        },

        /**
         * Helper for close() function
         */
        _close: function() {
            _mfpTrigger(CLOSE_EVENT);

            var classesToRemove = REMOVING_CLASS + ' ' + READY_CLASS + ' ';

            mfp.bgOverlay.detach();
            mfp.wrap.detach();
            mfp.container.empty();

            if(mfp.st.mainClass) {
                classesToRemove += mfp.st.mainClass + ' ';
            }

            mfp._removeClassFromMFP(classesToRemove);

            if(mfp.fixedContentPos) {
                var windowStyles = {marginRight: ''};
                if(mfp.isIE7) {
                    $('body, html').css('overflow', '');
                } else {
                    windowStyles.overflow = '';
                }
                $('html').css(windowStyles);
            }

            _document.off('keyup' + EVENT_NS + ' focusin' + EVENT_NS);
            mfp.ev.off(EVENT_NS);

            // clean up DOM elements that aren't removed
            mfp.wrap.attr('class', 'mfp-wrap').removeAttr('style');
            mfp.bgOverlay.attr('class', 'mfp-bg');
            mfp.container.attr('class', 'mfp-container');

            // remove close button from target element
            if(mfp.st.showCloseBtn &&
                (!mfp.st.closeBtnInside || mfp.currTemplate[mfp.currItem.type] === true)) {
                if(mfp.currTemplate.closeBtn)
                    mfp.currTemplate.closeBtn.detach();
            }


            if(mfp.st.autoFocusLast && mfp._lastFocusedEl) {
                $(mfp._lastFocusedEl).focus(); // put tab focus back
            }
            mfp.currItem = null;
            mfp.content = null;
            mfp.currTemplate = null;
            mfp.prevHeight = 0;

            _mfpTrigger(AFTER_CLOSE_EVENT);
        },

        updateSize: function(winHeight) {

            if(mfp.isIOS) {
                // fixes iOS nav bars https://github.com/dimsemenov/Magnific-Popup/issues/2
                var zoomLevel = document.documentElement.clientWidth / window.innerWidth;
                var height = window.innerHeight * zoomLevel;
                mfp.wrap.css('height', height);
                mfp.wH = height;
            } else {
                mfp.wH = winHeight || _window.height();
            }
            // Fixes #84: popup incorrectly positioned with position:relative on body
            if(!mfp.fixedContentPos) {
                mfp.wrap.css('height', mfp.wH);
            }

            _mfpTrigger('Resize');

        },

        /**
         * Set content of popup based on current index
         */
        updateItemHTML: function() {
            var item = mfp.items[mfp.index];

            // Detach and perform modifications
            mfp.contentContainer.detach();

            if(mfp.content)
                mfp.content.detach();

            if(!item.parsed) {
                item = mfp.parseEl( mfp.index );
            }

            var type = item.type;

            _mfpTrigger('BeforeChange', [mfp.currItem ? mfp.currItem.type : '', type]);
            // BeforeChange event works like so:
            // _mfpOn('BeforeChange', function(e, prevType, newType) { });

            mfp.currItem = item;

            if(!mfp.currTemplate[type]) {
                var markup = mfp.st[type] ? mfp.st[type].markup : false;

                // allows to modify markup
                _mfpTrigger('FirstMarkupParse', markup);

                if(markup) {
                    mfp.currTemplate[type] = $(markup);
                } else {
                    // if there is no markup found we just define that template is parsed
                    mfp.currTemplate[type] = true;
                }
            }

            if(_prevContentType && _prevContentType !== item.type) {
                mfp.container.removeClass('mfp-'+_prevContentType+'-holder');
            }

            var newContent = mfp['get' + type.charAt(0).toUpperCase() + type.slice(1)](item, mfp.currTemplate[type]);
            mfp.appendContent(newContent, type);

            item.preloaded = true;

            _mfpTrigger(CHANGE_EVENT, item);
            _prevContentType = item.type;

            // Append container back after its content changed
            mfp.container.prepend(mfp.contentContainer);

            _mfpTrigger('AfterChange');
        },


        /**
         * Set HTML content of popup
         */
        appendContent: function(newContent, type) {
            mfp.content = newContent;

            if(newContent) {
                if(mfp.st.showCloseBtn && mfp.st.closeBtnInside &&
                    mfp.currTemplate[type] === true) {
                    // if there is no markup, we just append close button element inside
                    if(!mfp.content.find('.mfp-close').length) {
                        mfp.content.append(_getCloseBtn());
                    }
                } else {
                    mfp.content = newContent;
                }
            } else {
                mfp.content = '';
            }

            _mfpTrigger(BEFORE_APPEND_EVENT);
            mfp.container.addClass('mfp-'+type+'-holder');

            mfp.contentContainer.append(mfp.content);
        },


        /**
         * Creates Magnific Popup data object based on given data
         * @param  {int} index Index of item to parse
         */
        parseEl: function(index) {
            var item = mfp.items[index],
                type;

            if(item.tagName) {
                item = { el: $(item) };
            } else {
                type = item.type;
                item = { data: item, src: item.src };
            }

            if(item.el) {
                var types = mfp.types;

                // check for 'mfp-TYPE' class
                for(var i = 0; i < types.length; i++) {
                    if( item.el.hasClass('mfp-'+types[i]) ) {
                        type = types[i];
                        break;
                    }
                }

                item.src = item.el.attr('data-mfp-src');
                if(!item.src) {
                    item.src = item.el.attr('href');
                }
            }

            item.type = type || mfp.st.type || 'inline';
            item.index = index;
            item.parsed = true;
            mfp.items[index] = item;
            _mfpTrigger('ElementParse', item);

            return mfp.items[index];
        },


        /**
         * Initializes single popup or a group of popups
         */
        addGroup: function(el, options) {
            var eHandler = function(e) {
                e.mfpEl = this;
                mfp._openClick(e, el, options);
            };

            if(!options) {
                options = {};
            }

            var eName = 'click.magnificPopup';
            options.mainEl = el;

            if(options.items) {
                options.isObj = true;
                el.off(eName).on(eName, eHandler);
            } else {
                options.isObj = false;
                if(options.delegate) {
                    el.off(eName).on(eName, options.delegate , eHandler);
                } else {
                    options.items = el;
                    el.off(eName).on(eName, eHandler);
                }
            }
        },
        _openClick: function(e, el, options) {
            var midClick = options.midClick !== undefined ? options.midClick : $.magnificPopup.defaults.midClick;


            if(!midClick && ( e.which === 2 || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey ) ) {
                return;
            }

            var disableOn = options.disableOn !== undefined ? options.disableOn : $.magnificPopup.defaults.disableOn;

            if(disableOn) {
                if($.isFunction(disableOn)) {
                    if( !disableOn.call(mfp) ) {
                        return true;
                    }
                } else { // else it's number
                    if( _window.width() < disableOn ) {
                        return true;
                    }
                }
            }

            if(e.type) {
                e.preventDefault();

                // This will prevent popup from closing if element is inside and popup is already opened
                if(mfp.isOpen) {
                    e.stopPropagation();
                }
            }

            options.el = $(e.mfpEl);
            if(options.delegate) {
                options.items = el.find(options.delegate);
            }
            mfp.open(options);
        },


        /**
         * Updates text on preloader
         */
        updateStatus: function(status, text) {

            if(mfp.preloader) {
                if(_prevStatus !== status) {
                    mfp.container.removeClass('mfp-s-'+_prevStatus);
                }

                if(!text && status === 'loading') {
                    text = mfp.st.tLoading;
                }

                var data = {
                    status: status,
                    text: text
                };
                // allows to modify status
                _mfpTrigger('UpdateStatus', data);

                status = data.status;
                text = data.text;

                mfp.preloader.html(text);

                mfp.preloader.find('a').on('click', function(e) {
                    e.stopImmediatePropagation();
                });

                mfp.container.addClass('mfp-s-'+status);
                _prevStatus = status;
            }
        },


        /*
         "Private" helpers that aren't private at all
         */
        // Check to close popup or not
        // "target" is an element that was clicked
        _checkIfClose: function(target) {

            if($(target).hasClass(PREVENT_CLOSE_CLASS)) {
                return;
            }

            var closeOnContent = mfp.st.closeOnContentClick;
            var closeOnBg = mfp.st.closeOnBgClick;

            if(closeOnContent && closeOnBg) {
                return true;
            } else {

                // We close the popup if click is on close button or on preloader. Or if there is no content.
                if(!mfp.content || $(target).hasClass('mfp-close') || (mfp.preloader && target === mfp.preloader[0]) ) {
                    return true;
                }

                // if click is outside the content
                if(  (target !== mfp.content[0] && !$.contains(mfp.content[0], target))  ) {
                    if(closeOnBg) {
                        // last check, if the clicked element is in DOM, (in case it's removed onclick)
                        if( $.contains(document, target) ) {
                            return true;
                        }
                    }
                } else if(closeOnContent) {
                    return true;
                }

            }
            return false;
        },
        _addClassToMFP: function(cName) {
            mfp.bgOverlay.addClass(cName);
            mfp.wrap.addClass(cName);
        },
        _removeClassFromMFP: function(cName) {
            this.bgOverlay.removeClass(cName);
            mfp.wrap.removeClass(cName);
        },
        _hasScrollBar: function(winHeight) {
            return (  (mfp.isIE7 ? _document.height() : document.body.scrollHeight) > (winHeight || _window.height()) );
        },
        _setFocus: function() {
            (mfp.st.focus ? mfp.content.find(mfp.st.focus).eq(0) : mfp.wrap).focus();
        },
        _onFocusIn: function(e) {
            if( e.target !== mfp.wrap[0] && !$.contains(mfp.wrap[0], e.target) ) {
                mfp._setFocus();
                return false;
            }
        },
        _parseMarkup: function(template, values, item) {
            var arr;
            if(item.data) {
                values = $.extend(item.data, values);
            }
            _mfpTrigger(MARKUP_PARSE_EVENT, [template, values, item] );

            $.each(values, function(key, value) {
                if(value === undefined || value === false) {
                    return true;
                }
                arr = key.split('_');
                if(arr.length > 1) {
                    var el = template.find(EVENT_NS + '-'+arr[0]);

                    if(el.length > 0) {
                        var attr = arr[1];
                        if(attr === 'replaceWith') {
                            if(el[0] !== value[0]) {
                                el.replaceWith(value);
                            }
                        } else if(attr === 'img') {
                            if(el.is('img')) {
                                el.attr('src', value);
                            } else {
                                el.replaceWith( $('<img>').attr('src', value).attr('class', el.attr('class')) );
                            }
                        } else {
                            el.attr(arr[1], value);
                        }
                    }

                } else {
                    template.find(EVENT_NS + '-'+key).html(value);
                }
            });
        },

        _getScrollbarSize: function() {
            // thx David
            if(mfp.scrollbarSize === undefined) {
                var scrollDiv = document.createElement("div");
                scrollDiv.style.cssText = 'width: 99px; height: 99px; overflow: scroll; position: absolute; top: -9999px;';
                document.body.appendChild(scrollDiv);
                mfp.scrollbarSize = scrollDiv.offsetWidth - scrollDiv.clientWidth;
                document.body.removeChild(scrollDiv);
            }
            return mfp.scrollbarSize;
        }

    }; /* MagnificPopup core prototype end */




    /**
     * Public static functions
     */
    $.magnificPopup = {
        instance: null,
        proto: MagnificPopup.prototype,
        modules: [],

        open: function(options, index) {
            _checkInstance();

            if(!options) {
                options = {};
            } else {
                options = $.extend(true, {}, options);
            }

            options.isObj = true;
            options.index = index || 0;
            return this.instance.open(options);
        },

        close: function() {
            return $.magnificPopup.instance && $.magnificPopup.instance.close();
        },

        registerModule: function(name, module) {
            if(module.options) {
                $.magnificPopup.defaults[name] = module.options;
            }
            $.extend(this.proto, module.proto);
            this.modules.push(name);
        },

        defaults: {

            // Info about options is in docs:
            // http://dimsemenov.com/plugins/magnific-popup/documentation.html#options

            disableOn: 0,

            key: null,

            midClick: false,

            mainClass: '',

            preloader: true,

            focus: '', // CSS selector of input to focus after popup is opened

            closeOnContentClick: false,

            closeOnBgClick: true,

            closeBtnInside: true,

            showCloseBtn: true,

            enableEscapeKey: true,

            modal: false,

            alignTop: false,

            removalDelay: 0,

            prependTo: null,

            fixedContentPos: 'auto',

            fixedBgPos: 'auto',

            overflowY: 'auto',

            closeMarkup: '<button title="%title%" type="button" class="mfp-close">&#215;</button>',

            tClose: 'Close (Esc)',

            tLoading: 'Loading...',

            autoFocusLast: true

        }
    };



    $.fn.magnificPopup = function(options) {
        _checkInstance();

        var jqEl = $(this);

        // We call some API method of first param is a string
        if (typeof options === "string" ) {

            if(options === 'open') {
                var items,
                    itemOpts = _isJQ ? jqEl.data('magnificPopup') : jqEl[0].magnificPopup,
                    index = parseInt(arguments[1], 10) || 0;

                if(itemOpts.items) {
                    items = itemOpts.items[index];
                } else {
                    items = jqEl;
                    if(itemOpts.delegate) {
                        items = items.find(itemOpts.delegate);
                    }
                    items = items.eq( index );
                }
                mfp._openClick({mfpEl:items}, jqEl, itemOpts);
            } else {
                if(mfp.isOpen)
                    mfp[options].apply(mfp, Array.prototype.slice.call(arguments, 1));
            }

        } else {
            // clone options obj
            options = $.extend(true, {}, options);

            /*
             * As Zepto doesn't support .data() method for objects
             * and it works only in normal browsers
             * we assign "options" object directly to the DOM element. FTW!
             */
            if(_isJQ) {
                jqEl.data('magnificPopup', options);
            } else {
                jqEl[0].magnificPopup = options;
            }

            mfp.addGroup(jqEl, options);

        }
        return jqEl;
    };

    /*>>core*/

    /*>>inline*/

    var INLINE_NS = 'inline',
        _hiddenClass,
        _inlinePlaceholder,
        _lastInlineElement,
        _putInlineElementsBack = function() {
            if(_lastInlineElement) {
                _inlinePlaceholder.after( _lastInlineElement.addClass(_hiddenClass) ).detach();
                _lastInlineElement = null;
            }
        };

    $.magnificPopup.registerModule(INLINE_NS, {
        options: {
            hiddenClass: 'hide', // will be appended with `mfp-` prefix
            markup: '',
            tNotFound: 'Content not found'
        },
        proto: {

            initInline: function() {
                mfp.types.push(INLINE_NS);

                _mfpOn(CLOSE_EVENT+'.'+INLINE_NS, function() {
                    _putInlineElementsBack();
                });
            },

            getInline: function(item, template) {

                _putInlineElementsBack();

                if(item.src) {
                    var inlineSt = mfp.st.inline,
                        el = $(item.src);

                    if(el.length) {

                        // If target element has parent - we replace it with placeholder and put it back after popup is closed
                        var parent = el[0].parentNode;
                        if(parent && parent.tagName) {
                            if(!_inlinePlaceholder) {
                                _hiddenClass = inlineSt.hiddenClass;
                                _inlinePlaceholder = _getEl(_hiddenClass);
                                _hiddenClass = 'mfp-'+_hiddenClass;
                            }
                            // replace target inline element with placeholder
                            _lastInlineElement = el.after(_inlinePlaceholder).detach().removeClass(_hiddenClass);
                        }

                        mfp.updateStatus('ready');
                    } else {
                        mfp.updateStatus('error', inlineSt.tNotFound);
                        el = $('<div>');
                    }

                    item.inlineElement = el;
                    return el;
                }

                mfp.updateStatus('ready');
                mfp._parseMarkup(template, {}, item);
                return template;
            }
        }
    });

    /*>>inline*/

    /*>>ajax*/
    var AJAX_NS = 'ajax',
        _ajaxCur,
        _removeAjaxCursor = function() {
            if(_ajaxCur) {
                $(document.body).removeClass(_ajaxCur);
            }
        },
        _destroyAjaxRequest = function() {
            _removeAjaxCursor();
            if(mfp.req) {
                mfp.req.abort();
            }
        };

    $.magnificPopup.registerModule(AJAX_NS, {

        options: {
            settings: null,
            cursor: 'mfp-ajax-cur',
            tError: '<a href="%url%">The content</a> could not be loaded.'
        },

        proto: {
            initAjax: function() {
                mfp.types.push(AJAX_NS);
                _ajaxCur = mfp.st.ajax.cursor;

                _mfpOn(CLOSE_EVENT+'.'+AJAX_NS, _destroyAjaxRequest);
                _mfpOn('BeforeChange.' + AJAX_NS, _destroyAjaxRequest);
            },
            getAjax: function(item) {

                if(_ajaxCur) {
                    $(document.body).addClass(_ajaxCur);
                }

                mfp.updateStatus('loading');

                var opts = $.extend({
                    url: item.src,
                    success: function(data, textStatus, jqXHR) {
                        var temp = {
                            data:data,
                            xhr:jqXHR
                        };

                        _mfpTrigger('ParseAjax', temp);

                        mfp.appendContent( $(temp.data), AJAX_NS );

                        item.finished = true;

                        _removeAjaxCursor();

                        mfp._setFocus();

                        setTimeout(function() {
                            mfp.wrap.addClass(READY_CLASS);
                        }, 16);

                        mfp.updateStatus('ready');

                        _mfpTrigger('AjaxContentAdded');
                    },
                    error: function() {
                        _removeAjaxCursor();
                        item.finished = item.loadError = true;
                        mfp.updateStatus('error', mfp.st.ajax.tError.replace('%url%', item.src));
                    }
                }, mfp.st.ajax.settings);

                mfp.req = $.ajax(opts);

                return '';
            }
        }
    });

    /*>>ajax*/

    /*>>image*/
    var _imgInterval,
        _getTitle = function(item) {
            if(item.data && item.data.title !== undefined)
                return item.data.title;

            var src = mfp.st.image.titleSrc;

            if(src) {
                if($.isFunction(src)) {
                    return src.call(mfp, item);
                } else if(item.el) {
                    return item.el.attr(src) || '';
                }
            }
            return '';
        };

    $.magnificPopup.registerModule('image', {

        options: {
            markup: '<div class="mfp-figure">'+
            '<div class="mfp-close"></div>'+
            '<figure>'+
            '<div class="mfp-img"></div>'+
            '<figcaption>'+
            '<div class="mfp-bottom-bar">'+
            '<div class="mfp-title"></div>'+
            '<div class="mfp-counter"></div>'+
            '</div>'+
            '</figcaption>'+
            '</figure>'+
            '</div>',
            cursor: 'mfp-zoom-out-cur',
            titleSrc: 'title',
            verticalFit: true,
            tError: '<a href="%url%">The image</a> could not be loaded.'
        },

        proto: {
            initImage: function() {
                var imgSt = mfp.st.image,
                    ns = '.image';

                mfp.types.push('image');

                _mfpOn(OPEN_EVENT+ns, function() {
                    if(mfp.currItem.type === 'image' && imgSt.cursor) {
                        $(document.body).addClass(imgSt.cursor);
                    }
                });

                _mfpOn(CLOSE_EVENT+ns, function() {
                    if(imgSt.cursor) {
                        $(document.body).removeClass(imgSt.cursor);
                    }
                    _window.off('resize' + EVENT_NS);
                });

                _mfpOn('Resize'+ns, mfp.resizeImage);
                if(mfp.isLowIE) {
                    _mfpOn('AfterChange', mfp.resizeImage);
                }
            },
            resizeImage: function() {
                var item = mfp.currItem;
                if(!item || !item.img) return;

                if(mfp.st.image.verticalFit) {
                    var decr = 0;
                    // fix box-sizing in ie7/8
                    if(mfp.isLowIE) {
                        decr = parseInt(item.img.css('padding-top'), 10) + parseInt(item.img.css('padding-bottom'),10);
                    }
                    item.img.css('max-height', mfp.wH-decr);
                }
            },
            _onImageHasSize: function(item) {
                if(item.img) {

                    item.hasSize = true;

                    if(_imgInterval) {
                        clearInterval(_imgInterval);
                    }

                    item.isCheckingImgSize = false;

                    _mfpTrigger('ImageHasSize', item);

                    if(item.imgHidden) {
                        if(mfp.content)
                            mfp.content.removeClass('mfp-loading');

                        item.imgHidden = false;
                    }

                }
            },

            /**
             * Function that loops until the image has size to display elements that rely on it asap
             */
            findImageSize: function(item) {

                var counter = 0,
                    img = item.img[0],
                    mfpSetInterval = function(delay) {

                        if(_imgInterval) {
                            clearInterval(_imgInterval);
                        }
                        // decelerating interval that checks for size of an image
                        _imgInterval = setInterval(function() {
                            if(img.naturalWidth > 0) {
                                mfp._onImageHasSize(item);
                                return;
                            }

                            if(counter > 200) {
                                clearInterval(_imgInterval);
                            }

                            counter++;
                            if(counter === 3) {
                                mfpSetInterval(10);
                            } else if(counter === 40) {
                                mfpSetInterval(50);
                            } else if(counter === 100) {
                                mfpSetInterval(500);
                            }
                        }, delay);
                    };

                mfpSetInterval(1);
            },

            getImage: function(item, template) {

                var guard = 0,

                // image load complete handler
                    onLoadComplete = function() {
                        if(item) {
                            if (item.img[0].complete) {
                                item.img.off('.mfploader');

                                if(item === mfp.currItem){
                                    mfp._onImageHasSize(item);

                                    mfp.updateStatus('ready');
                                }

                                item.hasSize = true;
                                item.loaded = true;

                                _mfpTrigger('ImageLoadComplete');

                            }
                            else {
                                // if image complete check fails 200 times (20 sec), we assume that there was an error.
                                guard++;
                                if(guard < 200) {
                                    setTimeout(onLoadComplete,100);
                                } else {
                                    onLoadError();
                                }
                            }
                        }
                    },

                // image error handler
                    onLoadError = function() {
                        if(item) {
                            item.img.off('.mfploader');
                            if(item === mfp.currItem){
                                mfp._onImageHasSize(item);
                                mfp.updateStatus('error', imgSt.tError.replace('%url%', item.src) );
                            }

                            item.hasSize = true;
                            item.loaded = true;
                            item.loadError = true;
                        }
                    },
                    imgSt = mfp.st.image;


                var el = template.find('.mfp-img');
                if(el.length) {
                    var img = document.createElement('img');
                    img.className = 'mfp-img';
                    if(item.el && item.el.find('img').length) {
                        img.alt = item.el.find('img').attr('alt');
                    }
                    item.img = $(img).on('load.mfploader', onLoadComplete).on('error.mfploader', onLoadError);
                    img.src = item.src;

                    // without clone() "error" event is not firing when IMG is replaced by new IMG
                    // TODO: find a way to avoid such cloning
                    if(el.is('img')) {
                        item.img = item.img.clone();
                    }

                    img = item.img[0];
                    if(img.naturalWidth > 0) {
                        item.hasSize = true;
                    } else if(!img.width) {
                        item.hasSize = false;
                    }
                }

                mfp._parseMarkup(template, {
                    title: _getTitle(item),
                    img_replaceWith: item.img
                }, item);

                mfp.resizeImage();

                if(item.hasSize) {
                    if(_imgInterval) clearInterval(_imgInterval);

                    if(item.loadError) {
                        template.addClass('mfp-loading');
                        mfp.updateStatus('error', imgSt.tError.replace('%url%', item.src) );
                    } else {
                        template.removeClass('mfp-loading');
                        mfp.updateStatus('ready');
                    }
                    return template;
                }

                mfp.updateStatus('loading');
                item.loading = true;

                if(!item.hasSize) {
                    item.imgHidden = true;
                    template.addClass('mfp-loading');
                    mfp.findImageSize(item);
                }

                return template;
            }
        }
    });

    /*>>image*/

    /*>>zoom*/
    var hasMozTransform,
        getHasMozTransform = function() {
            if(hasMozTransform === undefined) {
                hasMozTransform = document.createElement('p').style.MozTransform !== undefined;
            }
            return hasMozTransform;
        };

    $.magnificPopup.registerModule('zoom', {

        options: {
            enabled: false,
            easing: 'ease-in-out',
            duration: 300,
            opener: function(element) {
                return element.is('img') ? element : element.find('img');
            }
        },

        proto: {

            initZoom: function() {
                var zoomSt = mfp.st.zoom,
                    ns = '.zoom',
                    image;

                if(!zoomSt.enabled || !mfp.supportsTransition) {
                    return;
                }

                var duration = zoomSt.duration,
                    getElToAnimate = function(image) {
                        var newImg = image.clone().removeAttr('style').removeAttr('class').addClass('mfp-animated-image'),
                            transition = 'all '+(zoomSt.duration/1000)+'s ' + zoomSt.easing,
                            cssObj = {
                                position: 'fixed',
                                zIndex: 9999,
                                left: 0,
                                top: 0,
                                '-webkit-backface-visibility': 'hidden'
                            },
                            t = 'transition';

                        cssObj['-webkit-'+t] = cssObj['-moz-'+t] = cssObj['-o-'+t] = cssObj[t] = transition;

                        newImg.css(cssObj);
                        return newImg;
                    },
                    showMainContent = function() {
                        mfp.content.css('visibility', 'visible');
                    },
                    openTimeout,
                    animatedImg;

                _mfpOn('BuildControls'+ns, function() {
                    if(mfp._allowZoom()) {

                        clearTimeout(openTimeout);
                        mfp.content.css('visibility', 'hidden');

                        // Basically, all code below does is clones existing image, puts in on top of the current one and animated it

                        image = mfp._getItemToZoom();

                        if(!image) {
                            showMainContent();
                            return;
                        }

                        animatedImg = getElToAnimate(image);

                        animatedImg.css( mfp._getOffset() );

                        mfp.wrap.append(animatedImg);

                        openTimeout = setTimeout(function() {
                            animatedImg.css( mfp._getOffset( true ) );
                            openTimeout = setTimeout(function() {

                                showMainContent();

                                setTimeout(function() {
                                    animatedImg.remove();
                                    image = animatedImg = null;
                                    _mfpTrigger('ZoomAnimationEnded');
                                }, 16); // avoid blink when switching images

                            }, duration); // this timeout equals animation duration

                        }, 16); // by adding this timeout we avoid short glitch at the beginning of animation


                        // Lots of timeouts...
                    }
                });
                _mfpOn(BEFORE_CLOSE_EVENT+ns, function() {
                    if(mfp._allowZoom()) {

                        clearTimeout(openTimeout);

                        mfp.st.removalDelay = duration;

                        if(!image) {
                            image = mfp._getItemToZoom();
                            if(!image) {
                                return;
                            }
                            animatedImg = getElToAnimate(image);
                        }

                        animatedImg.css( mfp._getOffset(true) );
                        mfp.wrap.append(animatedImg);
                        mfp.content.css('visibility', 'hidden');

                        setTimeout(function() {
                            animatedImg.css( mfp._getOffset() );
                        }, 16);
                    }

                });

                _mfpOn(CLOSE_EVENT+ns, function() {
                    if(mfp._allowZoom()) {
                        showMainContent();
                        if(animatedImg) {
                            animatedImg.remove();
                        }
                        image = null;
                    }
                });
            },

            _allowZoom: function() {
                return mfp.currItem.type === 'image';
            },

            _getItemToZoom: function() {
                if(mfp.currItem.hasSize) {
                    return mfp.currItem.img;
                } else {
                    return false;
                }
            },

            // Get element postion relative to viewport
            _getOffset: function(isLarge) {
                var el;
                if(isLarge) {
                    el = mfp.currItem.img;
                } else {
                    el = mfp.st.zoom.opener(mfp.currItem.el || mfp.currItem);
                }

                var offset = el.offset();
                var paddingTop = parseInt(el.css('padding-top'),10);
                var paddingBottom = parseInt(el.css('padding-bottom'),10);
                offset.top -= ( $(window).scrollTop() - paddingTop );


                /*

                 Animating left + top + width/height looks glitchy in Firefox, but perfect in Chrome. And vice-versa.

                 */
                var obj = {
                    width: el.width(),
                    // fix Zepto height+padding issue
                    height: (_isJQ ? el.innerHeight() : el[0].offsetHeight) - paddingBottom - paddingTop
                };

                // I hate to do this, but there is no another option
                if( getHasMozTransform() ) {
                    obj['-moz-transform'] = obj['transform'] = 'translate(' + offset.left + 'px,' + offset.top + 'px)';
                } else {
                    obj.left = offset.left;
                    obj.top = offset.top;
                }
                return obj;
            }

        }
    });



    /*>>zoom*/

    /*>>iframe*/

    var IFRAME_NS = 'iframe',
        _emptyPage = '//about:blank',

        _fixIframeBugs = function(isShowing) {
            if(mfp.currTemplate[IFRAME_NS]) {
                var el = mfp.currTemplate[IFRAME_NS].find('iframe');
                if(el.length) {
                    // reset src after the popup is closed to avoid "video keeps playing after popup is closed" bug
                    if(!isShowing) {
                        el[0].src = _emptyPage;
                    }

                    // IE8 black screen bug fix
                    if(mfp.isIE8) {
                        el.css('display', isShowing ? 'block' : 'none');
                    }
                }
            }
        };

    $.magnificPopup.registerModule(IFRAME_NS, {

        options: {
            markup: '<div class="mfp-iframe-scaler">'+
            '<div class="mfp-close"></div>'+
            '<iframe class="mfp-iframe" src="//about:blank" frameborder="0" allowfullscreen></iframe>'+
            '</div>',

            srcAction: 'iframe_src',

            // we don't care and support only one default type of URL by default
            patterns: {
                youtube: {
                    index: 'youtube.com',
                    id: 'v=',
                    src: '//www.youtube.com/embed/%id%?autoplay=1'
                },
                vimeo: {
                    index: 'vimeo.com/',
                    id: '/',
                    src: '//player.vimeo.com/video/%id%?autoplay=1'
                },
                gmaps: {
                    index: '//maps.google.',
                    src: '%id%&output=embed'
                }
            }
        },

        proto: {
            initIframe: function() {
                mfp.types.push(IFRAME_NS);

                _mfpOn('BeforeChange', function(e, prevType, newType) {
                    if(prevType !== newType) {
                        if(prevType === IFRAME_NS) {
                            _fixIframeBugs(); // iframe if removed
                        } else if(newType === IFRAME_NS) {
                            _fixIframeBugs(true); // iframe is showing
                        }
                    }// else {
                    // iframe source is switched, don't do anything
                    //}
                });

                _mfpOn(CLOSE_EVENT + '.' + IFRAME_NS, function() {
                    _fixIframeBugs();
                });
            },

            getIframe: function(item, template) {
                var embedSrc = item.src;
                var iframeSt = mfp.st.iframe;

                $.each(iframeSt.patterns, function() {
                    if(embedSrc.indexOf( this.index ) > -1) {
                        if(this.id) {
                            if(typeof this.id === 'string') {
                                embedSrc = embedSrc.substr(embedSrc.lastIndexOf(this.id)+this.id.length, embedSrc.length);
                            } else {
                                embedSrc = this.id.call( this, embedSrc );
                            }
                        }
                        embedSrc = this.src.replace('%id%', embedSrc );
                        return false; // break;
                    }
                });

                var dataObj = {};
                if(iframeSt.srcAction) {
                    dataObj[iframeSt.srcAction] = embedSrc;
                }
                mfp._parseMarkup(template, dataObj, item);

                mfp.updateStatus('ready');

                return template;
            }
        }
    });



    /*>>iframe*/

    /*>>gallery*/
    /**
     * Get looped index depending on number of slides
     */
    var _getLoopedId = function(index) {
            var numSlides = mfp.items.length;
            if(index > numSlides - 1) {
                return index - numSlides;
            } else  if(index < 0) {
                return numSlides + index;
            }
            return index;
        },
        _replaceCurrTotal = function(text, curr, total) {
            return text.replace(/%curr%/gi, curr + 1).replace(/%total%/gi, total);
        };

    $.magnificPopup.registerModule('gallery', {

        options: {
            enabled: false,
            arrowMarkup: '<button title="%title%" type="button" class="mfp-arrow mfp-arrow-%dir%"></button>',
            preload: [0,2],
            navigateByImgClick: true,
            arrows: true,

            tPrev: 'Previous (Left arrow key)',
            tNext: 'Next (Right arrow key)',
            tCounter: '%curr% of %total%'
        },

        proto: {
            initGallery: function() {

                var gSt = mfp.st.gallery,
                    ns = '.mfp-gallery';

                mfp.direction = true; // true - next, false - prev

                if(!gSt || !gSt.enabled ) return false;

                _wrapClasses += ' mfp-gallery';

                _mfpOn(OPEN_EVENT+ns, function() {

                    if(gSt.navigateByImgClick) {
                        mfp.wrap.on('click'+ns, '.mfp-img', function() {
                            if(mfp.items.length > 1) {
                                mfp.next();
                                return false;
                            }
                        });
                    }

                    _document.on('keydown'+ns, function(e) {
                        if (e.keyCode === 37) {
                            mfp.prev();
                        } else if (e.keyCode === 39) {
                            mfp.next();
                        }
                    });
                });

                _mfpOn('UpdateStatus'+ns, function(e, data) {
                    if(data.text) {
                        data.text = _replaceCurrTotal(data.text, mfp.currItem.index, mfp.items.length);
                    }
                });

                _mfpOn(MARKUP_PARSE_EVENT+ns, function(e, element, values, item) {
                    var l = mfp.items.length;
                    values.counter = l > 1 ? _replaceCurrTotal(gSt.tCounter, item.index, l) : '';
                });

                _mfpOn('BuildControls' + ns, function() {
                    if(mfp.items.length > 1 && gSt.arrows && !mfp.arrowLeft) {
                        var markup = gSt.arrowMarkup,
                            arrowLeft = mfp.arrowLeft = $( markup.replace(/%title%/gi, gSt.tPrev).replace(/%dir%/gi, 'left') ).addClass(PREVENT_CLOSE_CLASS),
                            arrowRight = mfp.arrowRight = $( markup.replace(/%title%/gi, gSt.tNext).replace(/%dir%/gi, 'right') ).addClass(PREVENT_CLOSE_CLASS);

                        arrowLeft.click(function() {
                            mfp.prev();
                        });
                        arrowRight.click(function() {
                            mfp.next();
                        });

                        mfp.container.append(arrowLeft.add(arrowRight));
                    }
                });

                _mfpOn(CHANGE_EVENT+ns, function() {
                    if(mfp._preloadTimeout) clearTimeout(mfp._preloadTimeout);

                    mfp._preloadTimeout = setTimeout(function() {
                        mfp.preloadNearbyImages();
                        mfp._preloadTimeout = null;
                    }, 16);
                });


                _mfpOn(CLOSE_EVENT+ns, function() {
                    _document.off(ns);
                    mfp.wrap.off('click'+ns);
                    mfp.arrowRight = mfp.arrowLeft = null;
                });

            },
            next: function() {
                mfp.direction = true;
                mfp.index = _getLoopedId(mfp.index + 1);
                mfp.updateItemHTML();
            },
            prev: function() {
                mfp.direction = false;
                mfp.index = _getLoopedId(mfp.index - 1);
                mfp.updateItemHTML();
            },
            goTo: function(newIndex) {
                mfp.direction = (newIndex >= mfp.index);
                mfp.index = newIndex;
                mfp.updateItemHTML();
            },
            preloadNearbyImages: function() {
                var p = mfp.st.gallery.preload,
                    preloadBefore = Math.min(p[0], mfp.items.length),
                    preloadAfter = Math.min(p[1], mfp.items.length),
                    i;

                for(i = 1; i <= (mfp.direction ? preloadAfter : preloadBefore); i++) {
                    mfp._preloadItem(mfp.index+i);
                }
                for(i = 1; i <= (mfp.direction ? preloadBefore : preloadAfter); i++) {
                    mfp._preloadItem(mfp.index-i);
                }
            },
            _preloadItem: function(index) {
                index = _getLoopedId(index);

                if(mfp.items[index].preloaded) {
                    return;
                }

                var item = mfp.items[index];
                if(!item.parsed) {
                    item = mfp.parseEl( index );
                }

                _mfpTrigger('LazyLoad', item);

                if(item.type === 'image') {
                    item.img = $('<img class="mfp-img" />').on('load.mfploader', function() {
                        item.hasSize = true;
                    }).on('error.mfploader', function() {
                        item.hasSize = true;
                        item.loadError = true;
                        _mfpTrigger('LazyLoadError', item);
                    }).attr('src', item.src);
                }


                item.preloaded = true;
            }
        }
    });

    /*>>gallery*/

    /*>>retina*/

    var RETINA_NS = 'retina';

    $.magnificPopup.registerModule(RETINA_NS, {
        options: {
            replaceSrc: function(item) {
                return item.src.replace(/\.\w+$/, function(m) { return '@2x' + m; });
            },
            ratio: 1 // Function or number.  Set to 1 to disable.
        },
        proto: {
            initRetina: function() {
                if(window.devicePixelRatio > 1) {

                    var st = mfp.st.retina,
                        ratio = st.ratio;

                    ratio = !isNaN(ratio) ? ratio : ratio();

                    if(ratio > 1) {
                        _mfpOn('ImageHasSize' + '.' + RETINA_NS, function(e, item) {
                            item.img.css({
                                'max-width': item.img[0].naturalWidth / ratio,
                                'width': '100%'
                            });
                        });
                        _mfpOn('ElementParse' + '.' + RETINA_NS, function(e, item) {
                            item.src = st.replaceSrc(item, ratio);
                        });
                    }
                }

            }
        }
    });

    /*>>retina*/
    _checkInstance(); }));
/*
 * jquery-match-height 0.7.2 by @liabru
 * http://brm.io/jquery-match-height/
 * License MIT
 */
!function(t){"use strict";"function"==typeof define&&define.amd?define(["jquery"],t):"undefined"!=typeof module&&module.exports?module.exports=t(require("jquery")):t(jQuery)}(function(t){var e=-1,o=-1,n=function(t){return parseFloat(t)||0},a=function(e){var o=1,a=t(e),i=null,r=[];return a.each(function(){var e=t(this),a=e.offset().top-n(e.css("margin-top")),s=r.length>0?r[r.length-1]:null;null===s?r.push(e):Math.floor(Math.abs(i-a))<=o?r[r.length-1]=s.add(e):r.push(e),i=a}),r},i=function(e){var o={
    byRow:!0,property:"height",target:null,remove:!1};return"object"==typeof e?t.extend(o,e):("boolean"==typeof e?o.byRow=e:"remove"===e&&(o.remove=!0),o)},r=t.fn.matchHeight=function(e){var o=i(e);if(o.remove){var n=this;return this.css(o.property,""),t.each(r._groups,function(t,e){e.elements=e.elements.not(n)}),this}return this.length<=1&&!o.target?this:(r._groups.push({elements:this,options:o}),r._apply(this,o),this)};r.version="0.7.2",r._groups=[],r._throttle=80,r._maintainScroll=!1,r._beforeUpdate=null,
    r._afterUpdate=null,r._rows=a,r._parse=n,r._parseOptions=i,r._apply=function(e,o){var s=i(o),h=t(e),l=[h],c=t(window).scrollTop(),p=t("html").outerHeight(!0),u=h.parents().filter(":hidden");return u.each(function(){var e=t(this);e.data("style-cache",e.attr("style"))}),u.css("display","block"),s.byRow&&!s.target&&(h.each(function(){var e=t(this),o=e.css("display");"inline-block"!==o&&"flex"!==o&&"inline-flex"!==o&&(o="block"),e.data("style-cache",e.attr("style")),e.css({display:o,"padding-top":"0",
    "padding-bottom":"0","margin-top":"0","margin-bottom":"0","border-top-width":"0","border-bottom-width":"0",height:"100px",overflow:"hidden"})}),l=a(h),h.each(function(){var e=t(this);e.attr("style",e.data("style-cache")||"")})),t.each(l,function(e,o){var a=t(o),i=0;if(s.target)i=s.target.outerHeight(!1);else{if(s.byRow&&a.length<=1)return void a.css(s.property,"");a.each(function(){var e=t(this),o=e.attr("style"),n=e.css("display");"inline-block"!==n&&"flex"!==n&&"inline-flex"!==n&&(n="block");var a={
    display:n};a[s.property]="",e.css(a),e.outerHeight(!1)>i&&(i=e.outerHeight(!1)),o?e.attr("style",o):e.css("display","")})}a.each(function(){var e=t(this),o=0;s.target&&e.is(s.target)||("border-box"!==e.css("box-sizing")&&(o+=n(e.css("border-top-width"))+n(e.css("border-bottom-width")),o+=n(e.css("padding-top"))+n(e.css("padding-bottom"))),e.css(s.property,i-o+"px"))})}),u.each(function(){var e=t(this);e.attr("style",e.data("style-cache")||null)}),r._maintainScroll&&t(window).scrollTop(c/p*t("html").outerHeight(!0)),
    this},r._applyDataApi=function(){var e={};t("[data-match-height], [data-mh]").each(function(){var o=t(this),n=o.attr("data-mh")||o.attr("data-match-height");n in e?e[n]=e[n].add(o):e[n]=o}),t.each(e,function(){this.matchHeight(!0)})};var s=function(e){r._beforeUpdate&&r._beforeUpdate(e,r._groups),t.each(r._groups,function(){r._apply(this.elements,this.options)}),r._afterUpdate&&r._afterUpdate(e,r._groups)};r._update=function(n,a){if(a&&"resize"===a.type){var i=t(window).width();if(i===e)return;e=i;
}n?o===-1&&(o=setTimeout(function(){s(a),o=-1},r._throttle)):s(a)},t(r._applyDataApi);var h=t.fn.on?"on":"bind";t(window)[h]("load",function(t){r._update(!1,t)}),t(window)[h]("resize orientationchange",function(t){r._update(!0,t)})});
/*! Select2 4.0.6-rc.0 | https://github.com/select2/select2/blob/master/LICENSE.md */!

function(a) {
    "function" == typeof define && define.amd ? define(["jquery"], a) : "object" == typeof module && module.exports ? module.exports = function(b, c) {
        return void 0 === c && (c = "undefined" != typeof window ? require("jquery") : require("jquery")(b)), a(c), c
    } : a(jQuery)
}(function(a) {
    var b = function() {
            if (a && a.fn && a.fn.select2 && a.fn.select2.amd) var b = a.fn.select2.amd;
            var b;
            return function() {
                if (!b || !b.requirejs) {
                    b ? c = b : b = {};
                    var a, c, d;
                    ! function(b) {
                        function e(a, b) {
                            return v.call(a, b)
                        }

                        function f(a, b) {
                            var c, d, e, f, g, h, i, j, k, l, m, n, o = b && b.split("/"),
                                p = t.map,
                                q = p && p["*"] || {};
                            if (a) {
                                for (a = a.split("/"), g = a.length - 1, t.nodeIdCompat && x.test(a[g]) && (a[g] = a[g].replace(x, "")), "." === a[0].charAt(0) && o && (n = o.slice(0, o.length - 1), a = n.concat(a)), k = 0; k < a.length; k++)
                                    if ("." === (m = a[k])) a.splice(k, 1), k -= 1;
                                    else if (".." === m) {
                                    if (0 === k || 1 === k && ".." === a[2] || ".." === a[k - 1]) continue;
                                    k > 0 && (a.splice(k - 1, 2), k -= 2)
                                }
                                a = a.join("/")
                            }
                            if ((o || q) && p) {
                                for (c = a.split("/"), k = c.length; k > 0; k -= 1) {
                                    if (d = c.slice(0, k).join("/"), o)
                                        for (l = o.length; l > 0; l -= 1)
                                            if ((e = p[o.slice(0, l).join("/")]) && (e = e[d])) {
                                                f = e, h = k;
                                                break
                                            } if (f) break;
                                    !i && q && q[d] && (i = q[d], j = k)
                                }!f && i && (f = i, h = j), f && (c.splice(0, h, f), a = c.join("/"))
                            }
                            return a
                        }

                        function g(a, c) {
                            return function() {
                                var d = w.call(arguments, 0);
                                return "string" != typeof d[0] && 1 === d.length && d.push(null), o.apply(b, d.concat([a, c]))
                            }
                        }

                        function h(a) {
                            return function(b) {
                                return f(b, a)
                            }
                        }

                        function i(a) {
                            return function(b) {
                                r[a] = b
                            }
                        }

                        function j(a) {
                            if (e(s, a)) {
                                var c = s[a];
                                delete s[a], u[a] = !0, n.apply(b, c)
                            }
                            if (!e(r, a) && !e(u, a)) throw new Error("No " + a);
                            return r[a]
                        }

                        function k(a) {
                            var b, c = a ? a.indexOf("!") : -1;
                            return c > -1 && (b = a.substring(0, c), a = a.substring(c + 1, a.length)), [b, a]
                        }

                        function l(a) {
                            return a ? k(a) : []
                        }

                        function m(a) {
                            return function() {
                                return t && t.config && t.config[a] || {}
                            }
                        }
                        var n, o, p, q, r = {},
                            s = {},
                            t = {},
                            u = {},
                            v = Object.prototype.hasOwnProperty,
                            w = [].slice,
                            x = /\.js$/;
                        p = function(a, b) {
                            var c, d = k(a),
                                e = d[0],
                                g = b[1];
                            return a = d[1], e && (e = f(e, g), c = j(e)), e ? a = c && c.normalize ? c.normalize(a, h(g)) : f(a, g) : (a = f(a, g), d = k(a), e = d[0], a = d[1], e && (c = j(e))), {
                                f: e ? e + "!" + a : a,
                                n: a,
                                pr: e,
                                p: c
                            }
                        }, q = {
                            require: function(a) {
                                return g(a)
                            },
                            exports: function(a) {
                                var b = r[a];
                                return void 0 !== b ? b : r[a] = {}
                            },
                            module: function(a) {
                                return {
                                    id: a,
                                    uri: "",
                                    exports: r[a],
                                    config: m(a)
                                }
                            }
                        }, n = function(a, c, d, f) {
                            var h, k, m, n, o, t, v, w = [],
                                x = typeof d;
                            if (f = f || a, t = l(f), "undefined" === x || "function" === x) {
                                for (c = !c.length && d.length ? ["require", "exports", "module"] : c, o = 0; o < c.length; o += 1)
                                    if (n = p(c[o], t), "require" === (k = n.f)) w[o] = q.require(a);
                                    else if ("exports" === k) w[o] = q.exports(a), v = !0;
                                else if ("module" === k) h = w[o] = q.module(a);
                                else if (e(r, k) || e(s, k) || e(u, k)) w[o] = j(k);
                                else {
                                    if (!n.p) throw new Error(a + " missing " + k);
                                    n.p.load(n.n, g(f, !0), i(k), {}), w[o] = r[k]
                                }
                                m = d ? d.apply(r[a], w) : void 0, a && (h && h.exports !== b && h.exports !== r[a] ? r[a] = h.exports : m === b && v || (r[a] = m))
                            } else a && (r[a] = d)
                        }, a = c = o = function(a, c, d, e, f) {
                            if ("string" == typeof a) return q[a] ? q[a](c) : j(p(a, l(c)).f);
                            if (!a.splice) {
                                if (t = a, t.deps && o(t.deps, t.callback), !c) return;
                                c.splice ? (a = c, c = d, d = null) : a = b
                            }
                            return c = c || function() {}, "function" == typeof d && (d = e, e = f), e ? n(b, a, c, d) : setTimeout(function() {
                                n(b, a, c, d)
                            }, 4), o
                        }, o.config = function(a) {
                            return o(a)
                        }, a._defined = r, d = function(a, b, c) {
                            if ("string" != typeof a) throw new Error("See almond README: incorrect module build, no module name");
                            b.splice || (c = b, b = []), e(r, a) || e(s, a) || (s[a] = [a, b, c])
                        }, d.amd = {
                            jQuery: !0
                        }
                    }(), b.requirejs = a, b.require = c, b.define = d
                }
            }(), b.define("almond", function() {}), b.define("jquery", [], function() {
                var b = a || $;
                return null == b && console && console.error && console.error("Select2: An instance of jQuery or a jQuery-compatible library was not found. Make sure that you are including jQuery before Select2 on your web page."), b
            }), b.define("select2/utils", ["jquery"], function(a) {
                function b(a) {
                    var b = a.prototype,
                        c = [];
                    for (var d in b) {
                        "function" == typeof b[d] && ("constructor" !== d && c.push(d))
                    }
                    return c
                }
                var c = {};
                c.Extend = function(a, b) {
                    function c() {
                        this.constructor = a
                    }
                    var d = {}.hasOwnProperty;
                    for (var e in b) d.call(b, e) && (a[e] = b[e]);
                    return c.prototype = b.prototype, a.prototype = new c, a.__super__ = b.prototype, a
                }, c.Decorate = function(a, c) {
                    function d() {
                        var b = Array.prototype.unshift,
                            d = c.prototype.constructor.length,
                            e = a.prototype.constructor;
                        d > 0 && (b.call(arguments, a.prototype.constructor), e = c.prototype.constructor), e.apply(this, arguments)
                    }

                    function e() {
                        this.constructor = d
                    }
                    var f = b(c),
                        g = b(a);
                    c.displayName = a.displayName, d.prototype = new e;
                    for (var h = 0; h < g.length; h++) {
                        var i = g[h];
                        d.prototype[i] = a.prototype[i]
                    }
                    for (var j = (function(a) {
                            var b = function() {};
                            a in d.prototype && (b = d.prototype[a]);
                            var e = c.prototype[a];
                            return function() {
                                return Array.prototype.unshift.call(arguments, b), e.apply(this, arguments)
                            }
                        }), k = 0; k < f.length; k++) {
                        var l = f[k];
                        d.prototype[l] = j(l)
                    }
                    return d
                };
                var d = function() {
                    this.listeners = {}
                };
                d.prototype.on = function(a, b) {
                    this.listeners = this.listeners || {}, a in this.listeners ? this.listeners[a].push(b) : this.listeners[a] = [b]
                }, d.prototype.trigger = function(a) {
                    var b = Array.prototype.slice,
                        c = b.call(arguments, 1);
                    this.listeners = this.listeners || {}, null == c && (c = []), 0 === c.length && c.push({}), c[0]._type = a, a in this.listeners && this.invoke(this.listeners[a], b.call(arguments, 1)), "*" in this.listeners && this.invoke(this.listeners["*"], arguments)
                }, d.prototype.invoke = function(a, b) {
                    for (var c = 0, d = a.length; c < d; c++) a[c].apply(this, b)
                }, c.Observable = d, c.generateChars = function(a) {
                    for (var b = "", c = 0; c < a; c++) {
                        b += Math.floor(36 * Math.random()).toString(36)
                    }
                    return b
                }, c.bind = function(a, b) {
                    return function() {
                        a.apply(b, arguments)
                    }
                }, c._convertData = function(a) {
                    for (var b in a) {
                        var c = b.split("-"),
                            d = a;
                        if (1 !== c.length) {
                            for (var e = 0; e < c.length; e++) {
                                var f = c[e];
                                f = f.substring(0, 1).toLowerCase() + f.substring(1), f in d || (d[f] = {}), e == c.length - 1 && (d[f] = a[b]), d = d[f]
                            }
                            delete a[b]
                        }
                    }
                    return a
                }, c.hasScroll = function(b, c) {
                    var d = a(c),
                        e = c.style.overflowX,
                        f = c.style.overflowY;
                    return (e !== f || "hidden" !== f && "visible" !== f) && ("scroll" === e || "scroll" === f || (d.innerHeight() < c.scrollHeight || d.innerWidth() < c.scrollWidth))
                }, c.escapeMarkup = function(a) {
                    var b = {
                        "\\": "&#92;",
                        "&": "&amp;",
                        "<": "&lt;",
                        ">": "&gt;",
                        '"': "&quot;",
                        "'": "&#39;",
                        "/": "&#47;"
                    };
                    return "string" != typeof a ? a : String(a).replace(/[&<>"'\/\\]/g, function(a) {
                        return b[a]
                    })
                }, c.appendMany = function(b, c) {
                    if ("1.7" === a.fn.jquery.substr(0, 3)) {
                        var d = a();
                        a.map(c, function(a) {
                            d = d.add(a)
                        }), c = d
                    }
                    b.append(c)
                }, c.__cache = {};
                var e = 0;
                return c.GetUniqueElementId = function(a) {
                    var b = a.getAttribute("data-select2-id");
                    return null == b && (a.id ? (b = a.id, a.setAttribute("data-select2-id", b)) : (a.setAttribute("data-select2-id", ++e), b = e.toString())), b
                }, c.StoreData = function(a, b, d) {
                    var e = c.GetUniqueElementId(a);
                    c.__cache[e] || (c.__cache[e] = {}), c.__cache[e][b] = d
                }, c.GetData = function(b, d) {
                    var e = c.GetUniqueElementId(b);
                    return d ? c.__cache[e] && null != c.__cache[e][d] ? c.__cache[e][d] : a(b).data(d) : c.__cache[e]
                }, c.RemoveData = function(a) {
                    var b = c.GetUniqueElementId(a);
                    null != c.__cache[b] && delete c.__cache[b]
                }, c
            }), b.define("select2/results", ["jquery", "./utils"], function(a, b) {
                function c(a, b, d) {
                    this.$element = a, this.data = d, this.options = b, c.__super__.constructor.call(this)
                }
                return b.Extend(c, b.Observable), c.prototype.render = function() {
                    var b = a('<ul class="select2-results__options" role="tree"></ul>');
                    return this.options.get("multiple") && b.attr("aria-multiselectable", "true"), this.$results = b, b
                }, c.prototype.clear = function() {
                    this.$results.empty()
                }, c.prototype.displayMessage = function(b) {
                    var c = this.options.get("escapeMarkup");
                    this.clear(), this.hideLoading();
                    var d = a('<li role="treeitem" aria-live="assertive" class="select2-results__option"></li>'),
                        e = this.options.get("translations").get(b.message);
                    d.append(c(e(b.args))), d[0].className += " select2-results__message", this.$results.append(d)
                }, c.prototype.hideMessages = function() {
                    this.$results.find(".select2-results__message").remove()
                }, c.prototype.append = function(a) {
                    this.hideLoading();
                    var b = [];
                    if (null == a.results || 0 === a.results.length) return void(0 === this.$results.children().length && this.trigger("results:message", {
                        message: "noResults"
                    }));
                    a.results = this.sort(a.results);
                    for (var c = 0; c < a.results.length; c++) {
                        var d = a.results[c],
                            e = this.option(d);
                        b.push(e)
                    }
                    this.$results.append(b)
                }, c.prototype.position = function(a, b) {
                    b.find(".select2-results").append(a)
                }, c.prototype.sort = function(a) {
                    return this.options.get("sorter")(a)
                }, c.prototype.highlightFirstItem = function() {
                    var a = this.$results.find(".select2-results__option[aria-selected]"),
                        b = a.filter("[aria-selected=true]");
                    b.length > 0 ? b.first().trigger("mouseenter") : a.first().trigger("mouseenter"), this.ensureHighlightVisible()
                }, c.prototype.setClasses = function() {
                    var c = this;
                    this.data.current(function(d) {
                        var e = a.map(d, function(a) {
                            return a.id.toString()
                        });
                        c.$results.find(".select2-results__option[aria-selected]").each(function() {
                            var c = a(this),
                                d = b.GetData(this, "data"),
                                f = "" + d.id;
                            null != d.element && d.element.selected || null == d.element && a.inArray(f, e) > -1 ? c.attr("aria-selected", "true") : c.attr("aria-selected", "false")
                        })
                    })
                }, c.prototype.showLoading = function(a) {
                    this.hideLoading();
                    var b = this.options.get("translations").get("searching"),
                        c = {
                            disabled: !0,
                            loading: !0,
                            text: b(a)
                        },
                        d = this.option(c);
                    d.className += " loading-results", this.$results.prepend(d)
                }, c.prototype.hideLoading = function() {
                    this.$results.find(".loading-results").remove()
                }, c.prototype.option = function(c) {
                    var d = document.createElement("li");
                    d.className = "select2-results__option";
                    var e = {
                        role: "treeitem",
                        "aria-selected": "false"
                    };
                    c.disabled && (delete e["aria-selected"], e["aria-disabled"] = "true"), null == c.id && delete e["aria-selected"], null != c._resultId && (d.id = c._resultId), c.title && (d.title = c.title), c.children && (e.role = "group", e["aria-label"] = c.text, delete e["aria-selected"]);
                    for (var f in e) {
                        var g = e[f];
                        d.setAttribute(f, g)
                    }
                    if (c.children) {
                        var h = a(d),
                            i = document.createElement("strong");
                        i.className = "select2-results__group";
                        a(i);
                        this.template(c, i);
                        for (var j = [], k = 0; k < c.children.length; k++) {
                            var l = c.children[k],
                                m = this.option(l);
                            j.push(m)
                        }
                        var n = a("<ul></ul>", {
                            class: "select2-results__options select2-results__options--nested"
                        });
                        n.append(j), h.append(i), h.append(n)
                    } else this.template(c, d);
                    return b.StoreData(d, "data", c), d
                }, c.prototype.bind = function(c, d) {
                    var e = this,
                        f = c.id + "-results";
                    this.$results.attr("id", f), c.on("results:all", function(a) {
                        e.clear(), e.append(a.data), c.isOpen() && (e.setClasses(), e.highlightFirstItem())
                    }), c.on("results:append", function(a) {
                        e.append(a.data), c.isOpen() && e.setClasses()
                    }), c.on("query", function(a) {
                        e.hideMessages(), e.showLoading(a)
                    }), c.on("select", function() {
                        c.isOpen() && (e.setClasses(), e.highlightFirstItem())
                    }), c.on("unselect", function() {
                        c.isOpen() && (e.setClasses(), e.highlightFirstItem())
                    }), c.on("open", function() {
                        e.$results.attr("aria-expanded", "true"), e.$results.attr("aria-hidden", "false"), e.setClasses(), e.ensureHighlightVisible()
                    }), c.on("close", function() {
                        e.$results.attr("aria-expanded", "false"), e.$results.attr("aria-hidden", "true"), e.$results.removeAttr("aria-activedescendant")
                    }), c.on("results:toggle", function() {
                        var a = e.getHighlightedResults();
                        0 !== a.length && a.trigger("mouseup")
                    }), c.on("results:select", function() {
                        var a = e.getHighlightedResults();
                        if (0 !== a.length) {
                            var c = b.GetData(a[0], "data");
                            "true" == a.attr("aria-selected") ? e.trigger("close", {}) : e.trigger("select", {
                                data: c
                            })
                        }
                    }), c.on("results:previous", function() {
                        var a = e.getHighlightedResults(),
                            b = e.$results.find("[aria-selected]"),
                            c = b.index(a);
                        if (0 !== c) {
                            var d = c - 1;
                            0 === a.length && (d = 0);
                            var f = b.eq(d);
                            f.trigger("mouseenter");
                            var g = e.$results.offset().top,
                                h = f.offset().top,
                                i = e.$results.scrollTop() + (h - g);
                            0 === d ? e.$results.scrollTop(0) : h - g < 0 && e.$results.scrollTop(i)
                        }
                    }), c.on("results:next", function() {
                        var a = e.getHighlightedResults(),
                            b = e.$results.find("[aria-selected]"),
                            c = b.index(a),
                            d = c + 1;
                        if (!(d >= b.length)) {
                            var f = b.eq(d);
                            f.trigger("mouseenter");
                            var g = e.$results.offset().top + e.$results.outerHeight(!1),
                                h = f.offset().top + f.outerHeight(!1),
                                i = e.$results.scrollTop() + h - g;
                            0 === d ? e.$results.scrollTop(0) : h > g && e.$results.scrollTop(i)
                        }
                    }), c.on("results:focus", function(a) {
                        a.element.addClass("select2-results__option--highlighted")
                    }), c.on("results:message", function(a) {
                        e.displayMessage(a)
                    }), a.fn.mousewheel && this.$results.on("mousewheel", function(a) {
                        var b = e.$results.scrollTop(),
                            c = e.$results.get(0).scrollHeight - b + a.deltaY,
                            d = a.deltaY > 0 && b - a.deltaY <= 0,
                            f = a.deltaY < 0 && c <= e.$results.height();
                        d ? (e.$results.scrollTop(0), a.preventDefault(), a.stopPropagation()) : f && (e.$results.scrollTop(e.$results.get(0).scrollHeight - e.$results.height()), a.preventDefault(), a.stopPropagation())
                    }), this.$results.on("mouseup", ".select2-results__option[aria-selected]", function(c) {
                        var d = a(this),
                            f = b.GetData(this, "data");
                        if ("true" === d.attr("aria-selected")) return void(e.options.get("multiple") ? e.trigger("unselect", {
                            originalEvent: c,
                            data: f
                        }) : e.trigger("close", {}));
                        e.trigger("select", {
                            originalEvent: c,
                            data: f
                        })
                    }), this.$results.on("mouseenter", ".select2-results__option[aria-selected]", function(c) {
                        var d = b.GetData(this, "data");
                        e.getHighlightedResults().removeClass("select2-results__option--highlighted"), e.trigger("results:focus", {
                            data: d,
                            element: a(this)
                        })
                    })
                }, c.prototype.getHighlightedResults = function() {
                    return this.$results.find(".select2-results__option--highlighted")
                }, c.prototype.destroy = function() {
                    this.$results.remove()
                }, c.prototype.ensureHighlightVisible = function() {
                    var a = this.getHighlightedResults();
                    if (0 !== a.length) {
                        var b = this.$results.find("[aria-selected]"),
                            c = b.index(a),
                            d = this.$results.offset().top,
                            e = a.offset().top,
                            f = this.$results.scrollTop() + (e - d),
                            g = e - d;
                        f -= 2 * a.outerHeight(!1), c <= 2 ? this.$results.scrollTop(0) : (g > this.$results.outerHeight() || g < 0) && this.$results.scrollTop(f)
                    }
                }, c.prototype.template = function(b, c) {
                    var d = this.options.get("templateResult"),
                        e = this.options.get("escapeMarkup"),
                        f = d(b, c);
                    null == f ? c.style.display = "none" : "string" == typeof f ? c.innerHTML = e(f) : a(c).append(f)
                }, c
            }), b.define("select2/keys", [], function() {
                return {
                    BACKSPACE: 8,
                    TAB: 9,
                    ENTER: 13,
                    SHIFT: 16,
                    CTRL: 17,
                    ALT: 18,
                    ESC: 27,
                    SPACE: 32,
                    PAGE_UP: 33,
                    PAGE_DOWN: 34,
                    END: 35,
                    HOME: 36,
                    LEFT: 37,
                    UP: 38,
                    RIGHT: 39,
                    DOWN: 40,
                    DELETE: 46
                }
            }), b.define("select2/selection/base", ["jquery", "../utils", "../keys"], function(a, b, c) {
                function d(a, b) {
                    this.$element = a, this.options = b, d.__super__.constructor.call(this)
                }
                return b.Extend(d, b.Observable), d.prototype.render = function() {
                    var c = a('<span class="select2-selection" role="combobox"  aria-haspopup="true" aria-expanded="false"></span>');
                    return this._tabindex = 0, null != b.GetData(this.$element[0], "old-tabindex") ? this._tabindex = b.GetData(this.$element[0], "old-tabindex") : null != this.$element.attr("tabindex") && (this._tabindex = this.$element.attr("tabindex")), c.attr("title", this.$element.attr("title")), c.attr("tabindex", this._tabindex), this.$selection = c, c
                }, d.prototype.bind = function(a, b) {
                    var d = this,
                        e = (a.id, a.id + "-results");
                    this.container = a, this.$selection.on("focus", function(a) {
                        d.trigger("focus", a)
                    }), this.$selection.on("blur", function(a) {
                        d._handleBlur(a)
                    }), this.$selection.on("keydown", function(a) {
                        d.trigger("keypress", a), a.which === c.SPACE && a.preventDefault()
                    }), a.on("results:focus", function(a) {
                        d.$selection.attr("aria-activedescendant", a.data._resultId)
                    }), a.on("selection:update", function(a) {
                        d.update(a.data)
                    }), a.on("open", function() {
                        d.$selection.attr("aria-expanded", "true"), d.$selection.attr("aria-owns", e), d._attachCloseHandler(a)
                    }), a.on("close", function() {
                        d.$selection.attr("aria-expanded", "false"), d.$selection.removeAttr("aria-activedescendant"), d.$selection.removeAttr("aria-owns"), d.$selection.focus(), d._detachCloseHandler(a)
                    }), a.on("enable", function() {
                        d.$selection.attr("tabindex", d._tabindex)
                    }), a.on("disable", function() {
                        d.$selection.attr("tabindex", "-1")
                    })
                }, d.prototype._handleBlur = function(b) {
                    var c = this;
                    window.setTimeout(function() {
                        document.activeElement == c.$selection[0] || a.contains(c.$selection[0], document.activeElement) || c.trigger("blur", b)
                    }, 1)
                }, d.prototype._attachCloseHandler = function(c) {
                    a(document.body).on("mousedown.select2." + c.id, function(c) {
                        var d = a(c.target),
                            e = d.closest(".select2");
                        a(".select2.select2-container--open").each(function() {
                            a(this), this != e[0] && b.GetData(this, "element").select2("close")
                        })
                    })
                }, d.prototype._detachCloseHandler = function(b) {
                    a(document.body).off("mousedown.select2." + b.id)
                }, d.prototype.position = function(a, b) {
                    b.find(".selection").append(a)
                }, d.prototype.destroy = function() {
                    this._detachCloseHandler(this.container)
                }, d.prototype.update = function(a) {
                    throw new Error("The `update` method must be defined in child classes.")
                }, d
            }), b.define("select2/selection/single", ["jquery", "./base", "../utils", "../keys"], function(a, b, c, d) {
                function e() {
                    e.__super__.constructor.apply(this, arguments)
                }
                return c.Extend(e, b), e.prototype.render = function() {
                    var a = e.__super__.render.call(this);
                    return a.addClass("select2-selection--single"), a.html('<span class="select2-selection__rendered"></span><span class="select2-selection__arrow" role="presentation"><b role="presentation"></b></span>'), a
                }, e.prototype.bind = function(a, b) {
                    var c = this;
                    e.__super__.bind.apply(this, arguments);
                    var d = a.id + "-container";
                    this.$selection.find(".select2-selection__rendered").attr("id", d).attr("role", "textbox").attr("aria-readonly", "true"), this.$selection.attr("aria-labelledby", d), this.$selection.on("mousedown", function(a) {
                        1 === a.which && c.trigger("toggle", {
                            originalEvent: a
                        })
                    }), this.$selection.on("focus", function(a) {}), this.$selection.on("blur", function(a) {}), a.on("focus", function(b) {
                        a.isOpen() || c.$selection.focus()
                    })
                }, e.prototype.clear = function() {
                    var a = this.$selection.find(".select2-selection__rendered");
                    a.empty(), a.removeAttr("title")
                }, e.prototype.display = function(a, b) {
                    var c = this.options.get("templateSelection");
                    return this.options.get("escapeMarkup")(c(a, b))
                }, e.prototype.selectionContainer = function() {
                    return a("<span></span>")
                }, e.prototype.update = function(a) {
                    if (0 === a.length) return void this.clear();
                    var b = a[0],
                        c = this.$selection.find(".select2-selection__rendered"),
                        d = this.display(b, c);
                    c.empty().append(d), c.attr("title", b.title || b.text)
                }, e
            }), b.define("select2/selection/multiple", ["jquery", "./base", "../utils"], function(a, b, c) {
                function d(a, b) {
                    d.__super__.constructor.apply(this, arguments)
                }
                return c.Extend(d, b), d.prototype.render = function() {
                    var a = d.__super__.render.call(this);
                    return a.addClass("select2-selection--multiple"), a.html('<ul class="select2-selection__rendered"></ul>'), a
                }, d.prototype.bind = function(b, e) {
                    var f = this;
                    d.__super__.bind.apply(this, arguments), this.$selection.on("click", function(a) {
                        f.trigger("toggle", {
                            originalEvent: a
                        })
                    }), this.$selection.on("click", ".select2-selection__choice__remove", function(b) {
                        if (!f.options.get("disabled")) {
                            var d = a(this),
                                e = d.parent(),
                                g = c.GetData(e[0], "data");
                            f.trigger("unselect", {
                                originalEvent: b,
                                data: g
                            })
                        }
                    })
                }, d.prototype.clear = function() {
                    var a = this.$selection.find(".select2-selection__rendered");
                    a.empty(), a.removeAttr("title")
                }, d.prototype.display = function(a, b) {
                    var c = this.options.get("templateSelection");
                    return this.options.get("escapeMarkup")(c(a, b))
                }, d.prototype.selectionContainer = function() {
                    return a('<li class="select2-selection__choice"><span class="select2-selection__choice__remove" role="presentation">&times;</span></li>')
                }, d.prototype.update = function(a) {
                    if (this.clear(), 0 !== a.length) {
                        for (var b = [], d = 0; d < a.length; d++) {
                            var e = a[d],
                                f = this.selectionContainer(),
                                g = this.display(e, f);
                            f.append(g), f.attr("title", e.title || e.text), c.StoreData(f[0], "data", e), b.push(f)
                        }
                        var h = this.$selection.find(".select2-selection__rendered");
                        c.appendMany(h, b)
                    }
                }, d
            }), b.define("select2/selection/placeholder", ["../utils"], function(a) {
                function b(a, b, c) {
                    this.placeholder = this.normalizePlaceholder(c.get("placeholder")), a.call(this, b, c)
                }
                return b.prototype.normalizePlaceholder = function(a, b) {
                    return "string" == typeof b && (b = {
                        id: "",
                        text: b
                    }), b
                }, b.prototype.createPlaceholder = function(a, b) {
                    var c = this.selectionContainer();
                    return c.html(this.display(b)), c.addClass("select2-selection__placeholder").removeClass("select2-selection__choice"), c
                }, b.prototype.update = function(a, b) {
                    var c = 1 == b.length && b[0].id != this.placeholder.id;
                    if (b.length > 1 || c) return a.call(this, b);
                    this.clear();
                    var d = this.createPlaceholder(this.placeholder);
                    this.$selection.find(".select2-selection__rendered").append(d)
                }, b
            }), b.define("select2/selection/allowClear", ["jquery", "../keys", "../utils"], function(a, b, c) {
                function d() {}
                return d.prototype.bind = function(a, b, c) {
                    var d = this;
                    a.call(this, b, c), null == this.placeholder && this.options.get("debug") && window.console && console.error && console.error("Select2: The `allowClear` option should be used in combination with the `placeholder` option."), this.$selection.on("mousedown", ".select2-selection__clear", function(a) {
                        d._handleClear(a)
                    }), b.on("keypress", function(a) {
                        d._handleKeyboardClear(a, b)
                    })
                }, d.prototype._handleClear = function(a, b) {
                    if (!this.options.get("disabled")) {
                        var d = this.$selection.find(".select2-selection__clear");
                        if (0 !== d.length) {
                            b.stopPropagation();
                            var e = c.GetData(d[0], "data"),
                                f = this.$element.val();
                            this.$element.val(this.placeholder.id);
                            var g = {
                                data: e
                            };
                            if (this.trigger("clear", g), g.prevented) return void this.$element.val(f);
                            for (var h = 0; h < e.length; h++)
                                if (g = {
                                        data: e[h]
                                    }, this.trigger("unselect", g), g.prevented) return void this.$element.val(f);
                            this.$element.trigger("change"), this.trigger("toggle", {})
                        }
                    }
                }, d.prototype._handleKeyboardClear = function(a, c, d) {
                    d.isOpen() || c.which != b.DELETE && c.which != b.BACKSPACE || this._handleClear(c)
                }, d.prototype.update = function(b, d) {
                    if (b.call(this, d), !(this.$selection.find(".select2-selection__placeholder").length > 0 || 0 === d.length)) {
                        var e = a('<span class="select2-selection__clear">&times;</span>');
                        c.StoreData(e[0], "data", d), this.$selection.find(".select2-selection__rendered").prepend(e)
                    }
                }, d
            }), b.define("select2/selection/search", ["jquery", "../utils", "../keys"], function(a, b, c) {
                function d(a, b, c) {
                    a.call(this, b, c)
                }
                return d.prototype.render = function(b) {
                    var c = a('<li class="select2-search select2-search--inline"><input class="select2-search__field" type="search" tabindex="-1" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" role="textbox" aria-autocomplete="list" /></li>');
                    this.$searchContainer = c, this.$search = c.find("input");
                    var d = b.call(this);
                    return this._transferTabIndex(), d
                }, d.prototype.bind = function(a, d, e) {
                    var f = this;
                    a.call(this, d, e), d.on("open", function() {
                        f.$search.trigger("focus")
                    }), d.on("close", function() {
                        f.$search.val(""), f.$search.removeAttr("aria-activedescendant"), f.$search.trigger("focus")
                    }), d.on("enable", function() {
                        f.$search.prop("disabled", !1), f._transferTabIndex()
                    }), d.on("disable", function() {
                        f.$search.prop("disabled", !0)
                    }), d.on("focus", function(a) {
                        f.$search.trigger("focus")
                    }), d.on("results:focus", function(a) {
                        f.$search.attr("aria-activedescendant", a.id)
                    }), this.$selection.on("focusin", ".select2-search--inline", function(a) {
                        f.trigger("focus", a)
                    }), this.$selection.on("focusout", ".select2-search--inline", function(a) {
                        f._handleBlur(a)
                    }), this.$selection.on("keydown", ".select2-search--inline", function(a) {
                        if (a.stopPropagation(), f.trigger("keypress", a), f._keyUpPrevented = a.isDefaultPrevented(), a.which === c.BACKSPACE && "" === f.$search.val()) {
                            var d = f.$searchContainer.prev(".select2-selection__choice");
                            if (d.length > 0) {
                                var e = b.GetData(d[0], "data");
                                f.searchRemoveChoice(e), a.preventDefault()
                            }
                        }
                    });
                    var g = document.documentMode,
                        h = g && g <= 11;
                    this.$selection.on("input.searchcheck", ".select2-search--inline", function(a) {
                        if (h) return void f.$selection.off("input.search input.searchcheck");
                        f.$selection.off("keyup.search")
                    }), this.$selection.on("keyup.search input.search", ".select2-search--inline", function(a) {
                        if (h && "input" === a.type) return void f.$selection.off("input.search input.searchcheck");
                        var b = a.which;
                        b != c.SHIFT && b != c.CTRL && b != c.ALT && b != c.TAB && f.handleSearch(a)
                    })
                }, d.prototype._transferTabIndex = function(a) {
                    this.$search.attr("tabindex", this.$selection.attr("tabindex")), this.$selection.attr("tabindex", "-1")
                }, d.prototype.createPlaceholder = function(a, b) {
                    this.$search.attr("placeholder", b.text)
                }, d.prototype.update = function(a, b) {
                    var c = this.$search[0] == document.activeElement;
                    this.$search.attr("placeholder", ""), a.call(this, b), this.$selection.find(".select2-selection__rendered").append(this.$searchContainer), this.resizeSearch(), c && this.$search.focus()
                }, d.prototype.handleSearch = function() {
                    if (this.resizeSearch(), !this._keyUpPrevented) {
                        var a = this.$search.val();
                        this.trigger("query", {
                            term: a
                        })
                    }
                    this._keyUpPrevented = !1
                }, d.prototype.searchRemoveChoice = function(a, b) {
                    this.trigger("unselect", {
                        data: b
                    }), this.$search.val(b.text), this.handleSearch()
                }, d.prototype.resizeSearch = function() {
                    this.$search.css("width", "25px");
                    var a = "";
                    if ("" !== this.$search.attr("placeholder")) a = this.$selection.find(".select2-selection__rendered").innerWidth();
                    else {
                        a = .75 * (this.$search.val().length + 1) + "em"
                    }
                    this.$search.css("width", a)
                }, d
            }), b.define("select2/selection/eventRelay", ["jquery"], function(a) {
                function b() {}
                return b.prototype.bind = function(b, c, d) {
                    var e = this,
                        f = ["open", "opening", "close", "closing", "select", "selecting", "unselect", "unselecting", "clear", "clearing"],
                        g = ["opening", "closing", "selecting", "unselecting", "clearing"];
                    b.call(this, c, d), c.on("*", function(b, c) {
                        if (-1 !== a.inArray(b, f)) {
                            c = c || {};
                            var d = a.Event("select2:" + b, {
                                params: c
                            });
                            e.$element.trigger(d), -1 !== a.inArray(b, g) && (c.prevented = d.isDefaultPrevented())
                        }
                    })
                }, b
            }), b.define("select2/translation", ["jquery", "require"], function(a, b) {
                function c(a) {
                    this.dict = a || {}
                }
                return c.prototype.all = function() {
                    return this.dict
                }, c.prototype.get = function(a) {
                    return this.dict[a]
                }, c.prototype.extend = function(b) {
                    this.dict = a.extend({}, b.all(), this.dict)
                }, c._cache = {}, c.loadPath = function(a) {
                    if (!(a in c._cache)) {
                        var d = b(a);
                        c._cache[a] = d
                    }
                    return new c(c._cache[a])
                }, c
            }), b.define("select2/diacritics", [], function() {
                return {
                    "Ⓐ": "A",
                    "Ａ": "A",
                    "À": "A",
                    "Á": "A",
                    "Â": "A",
                    "Ầ": "A",
                    "Ấ": "A",
                    "Ẫ": "A",
                    "Ẩ": "A",
                    "Ã": "A",
                    "Ā": "A",
                    "Ă": "A",
                    "Ằ": "A",
                    "Ắ": "A",
                    "Ẵ": "A",
                    "Ẳ": "A",
                    "Ȧ": "A",
                    "Ǡ": "A",
                    "Ä": "A",
                    "Ǟ": "A",
                    "Ả": "A",
                    "Å": "A",
                    "Ǻ": "A",
                    "Ǎ": "A",
                    "Ȁ": "A",
                    "Ȃ": "A",
                    "Ạ": "A",
                    "Ậ": "A",
                    "Ặ": "A",
                    "Ḁ": "A",
                    "Ą": "A",
                    "Ⱥ": "A",
                    "Ɐ": "A",
                    "Ꜳ": "AA",
                    "Æ": "AE",
                    "Ǽ": "AE",
                    "Ǣ": "AE",
                    "Ꜵ": "AO",
                    "Ꜷ": "AU",
                    "Ꜹ": "AV",
                    "Ꜻ": "AV",
                    "Ꜽ": "AY",
                    "Ⓑ": "B",
                    "Ｂ": "B",
                    "Ḃ": "B",
                    "Ḅ": "B",
                    "Ḇ": "B",
                    "Ƀ": "B",
                    "Ƃ": "B",
                    "Ɓ": "B",
                    "Ⓒ": "C",
                    "Ｃ": "C",
                    "Ć": "C",
                    "Ĉ": "C",
                    "Ċ": "C",
                    "Č": "C",
                    "Ç": "C",
                    "Ḉ": "C",
                    "Ƈ": "C",
                    "Ȼ": "C",
                    "Ꜿ": "C",
                    "Ⓓ": "D",
                    "Ｄ": "D",
                    "Ḋ": "D",
                    "Ď": "D",
                    "Ḍ": "D",
                    "Ḑ": "D",
                    "Ḓ": "D",
                    "Ḏ": "D",
                    "Đ": "D",
                    "Ƌ": "D",
                    "Ɗ": "D",
                    "Ɖ": "D",
                    "Ꝺ": "D",
                    "Ǳ": "DZ",
                    "Ǆ": "DZ",
                    "ǲ": "Dz",
                    "ǅ": "Dz",
                    "Ⓔ": "E",
                    "Ｅ": "E",
                    "È": "E",
                    "É": "E",
                    "Ê": "E",
                    "Ề": "E",
                    "Ế": "E",
                    "Ễ": "E",
                    "Ể": "E",
                    "Ẽ": "E",
                    "Ē": "E",
                    "Ḕ": "E",
                    "Ḗ": "E",
                    "Ĕ": "E",
                    "Ė": "E",
                    "Ë": "E",
                    "Ẻ": "E",
                    "Ě": "E",
                    "Ȅ": "E",
                    "Ȇ": "E",
                    "Ẹ": "E",
                    "Ệ": "E",
                    "Ȩ": "E",
                    "Ḝ": "E",
                    "Ę": "E",
                    "Ḙ": "E",
                    "Ḛ": "E",
                    "Ɛ": "E",
                    "Ǝ": "E",
                    "Ⓕ": "F",
                    "Ｆ": "F",
                    "Ḟ": "F",
                    "Ƒ": "F",
                    "Ꝼ": "F",
                    "Ⓖ": "G",
                    "Ｇ": "G",
                    "Ǵ": "G",
                    "Ĝ": "G",
                    "Ḡ": "G",
                    "Ğ": "G",
                    "Ġ": "G",
                    "Ǧ": "G",
                    "Ģ": "G",
                    "Ǥ": "G",
                    "Ɠ": "G",
                    "Ꞡ": "G",
                    "Ᵹ": "G",
                    "Ꝿ": "G",
                    "Ⓗ": "H",
                    "Ｈ": "H",
                    "Ĥ": "H",
                    "Ḣ": "H",
                    "Ḧ": "H",
                    "Ȟ": "H",
                    "Ḥ": "H",
                    "Ḩ": "H",
                    "Ḫ": "H",
                    "Ħ": "H",
                    "Ⱨ": "H",
                    "Ⱶ": "H",
                    "Ɥ": "H",
                    "Ⓘ": "I",
                    "Ｉ": "I",
                    "Ì": "I",
                    "Í": "I",
                    "Î": "I",
                    "Ĩ": "I",
                    "Ī": "I",
                    "Ĭ": "I",
                    "İ": "I",
                    "Ï": "I",
                    "Ḯ": "I",
                    "Ỉ": "I",
                    "Ǐ": "I",
                    "Ȉ": "I",
                    "Ȋ": "I",
                    "Ị": "I",
                    "Į": "I",
                    "Ḭ": "I",
                    "Ɨ": "I",
                    "Ⓙ": "J",
                    "Ｊ": "J",
                    "Ĵ": "J",
                    "Ɉ": "J",
                    "Ⓚ": "K",
                    "Ｋ": "K",
                    "Ḱ": "K",
                    "Ǩ": "K",
                    "Ḳ": "K",
                    "Ķ": "K",
                    "Ḵ": "K",
                    "Ƙ": "K",
                    "Ⱪ": "K",
                    "Ꝁ": "K",
                    "Ꝃ": "K",
                    "Ꝅ": "K",
                    "Ꞣ": "K",
                    "Ⓛ": "L",
                    "Ｌ": "L",
                    "Ŀ": "L",
                    "Ĺ": "L",
                    "Ľ": "L",
                    "Ḷ": "L",
                    "Ḹ": "L",
                    "Ļ": "L",
                    "Ḽ": "L",
                    "Ḻ": "L",
                    "Ł": "L",
                    "Ƚ": "L",
                    "Ɫ": "L",
                    "Ⱡ": "L",
                    "Ꝉ": "L",
                    "Ꝇ": "L",
                    "Ꞁ": "L",
                    "Ǉ": "LJ",
                    "ǈ": "Lj",
                    "Ⓜ": "M",
                    "Ｍ": "M",
                    "Ḿ": "M",
                    "Ṁ": "M",
                    "Ṃ": "M",
                    "Ɱ": "M",
                    "Ɯ": "M",
                    "Ⓝ": "N",
                    "Ｎ": "N",
                    "Ǹ": "N",
                    "Ń": "N",
                    "Ñ": "N",
                    "Ṅ": "N",
                    "Ň": "N",
                    "Ṇ": "N",
                    "Ņ": "N",
                    "Ṋ": "N",
                    "Ṉ": "N",
                    "Ƞ": "N",
                    "Ɲ": "N",
                    "Ꞑ": "N",
                    "Ꞥ": "N",
                    "Ǌ": "NJ",
                    "ǋ": "Nj",
                    "Ⓞ": "O",
                    "Ｏ": "O",
                    "Ò": "O",
                    "Ó": "O",
                    "Ô": "O",
                    "Ồ": "O",
                    "Ố": "O",
                    "Ỗ": "O",
                    "Ổ": "O",
                    "Õ": "O",
                    "Ṍ": "O",
                    "Ȭ": "O",
                    "Ṏ": "O",
                    "Ō": "O",
                    "Ṑ": "O",
                    "Ṓ": "O",
                    "Ŏ": "O",
                    "Ȯ": "O",
                    "Ȱ": "O",
                    "Ö": "O",
                    "Ȫ": "O",
                    "Ỏ": "O",
                    "Ő": "O",
                    "Ǒ": "O",
                    "Ȍ": "O",
                    "Ȏ": "O",
                    "Ơ": "O",
                    "Ờ": "O",
                    "Ớ": "O",
                    "Ỡ": "O",
                    "Ở": "O",
                    "Ợ": "O",
                    "Ọ": "O",
                    "Ộ": "O",
                    "Ǫ": "O",
                    "Ǭ": "O",
                    "Ø": "O",
                    "Ǿ": "O",
                    "Ɔ": "O",
                    "Ɵ": "O",
                    "Ꝋ": "O",
                    "Ꝍ": "O",
                    "Ƣ": "OI",
                    "Ꝏ": "OO",
                    "Ȣ": "OU",
                    "Ⓟ": "P",
                    "Ｐ": "P",
                    "Ṕ": "P",
                    "Ṗ": "P",
                    "Ƥ": "P",
                    "Ᵽ": "P",
                    "Ꝑ": "P",
                    "Ꝓ": "P",
                    "Ꝕ": "P",
                    "Ⓠ": "Q",
                    "Ｑ": "Q",
                    "Ꝗ": "Q",
                    "Ꝙ": "Q",
                    "Ɋ": "Q",
                    "Ⓡ": "R",
                    "Ｒ": "R",
                    "Ŕ": "R",
                    "Ṙ": "R",
                    "Ř": "R",
                    "Ȑ": "R",
                    "Ȓ": "R",
                    "Ṛ": "R",
                    "Ṝ": "R",
                    "Ŗ": "R",
                    "Ṟ": "R",
                    "Ɍ": "R",
                    "Ɽ": "R",
                    "Ꝛ": "R",
                    "Ꞧ": "R",
                    "Ꞃ": "R",
                    "Ⓢ": "S",
                    "Ｓ": "S",
                    "ẞ": "S",
                    "Ś": "S",
                    "Ṥ": "S",
                    "Ŝ": "S",
                    "Ṡ": "S",
                    "Š": "S",
                    "Ṧ": "S",
                    "Ṣ": "S",
                    "Ṩ": "S",
                    "Ș": "S",
                    "Ş": "S",
                    "Ȿ": "S",
                    "Ꞩ": "S",
                    "Ꞅ": "S",
                    "Ⓣ": "T",
                    "Ｔ": "T",
                    "Ṫ": "T",
                    "Ť": "T",
                    "Ṭ": "T",
                    "Ț": "T",
                    "Ţ": "T",
                    "Ṱ": "T",
                    "Ṯ": "T",
                    "Ŧ": "T",
                    "Ƭ": "T",
                    "Ʈ": "T",
                    "Ⱦ": "T",
                    "Ꞇ": "T",
                    "Ꜩ": "TZ",
                    "Ⓤ": "U",
                    "Ｕ": "U",
                    "Ù": "U",
                    "Ú": "U",
                    "Û": "U",
                    "Ũ": "U",
                    "Ṹ": "U",
                    "Ū": "U",
                    "Ṻ": "U",
                    "Ŭ": "U",
                    "Ü": "U",
                    "Ǜ": "U",
                    "Ǘ": "U",
                    "Ǖ": "U",
                    "Ǚ": "U",
                    "Ủ": "U",
                    "Ů": "U",
                    "Ű": "U",
                    "Ǔ": "U",
                    "Ȕ": "U",
                    "Ȗ": "U",
                    "Ư": "U",
                    "Ừ": "U",
                    "Ứ": "U",
                    "Ữ": "U",
                    "Ử": "U",
                    "Ự": "U",
                    "Ụ": "U",
                    "Ṳ": "U",
                    "Ų": "U",
                    "Ṷ": "U",
                    "Ṵ": "U",
                    "Ʉ": "U",
                    "Ⓥ": "V",
                    "Ｖ": "V",
                    "Ṽ": "V",
                    "Ṿ": "V",
                    "Ʋ": "V",
                    "Ꝟ": "V",
                    "Ʌ": "V",
                    "Ꝡ": "VY",
                    "Ⓦ": "W",
                    "Ｗ": "W",
                    "Ẁ": "W",
                    "Ẃ": "W",
                    "Ŵ": "W",
                    "Ẇ": "W",
                    "Ẅ": "W",
                    "Ẉ": "W",
                    "Ⱳ": "W",
                    "Ⓧ": "X",
                    "Ｘ": "X",
                    "Ẋ": "X",
                    "Ẍ": "X",
                    "Ⓨ": "Y",
                    "Ｙ": "Y",
                    "Ỳ": "Y",
                    "Ý": "Y",
                    "Ŷ": "Y",
                    "Ỹ": "Y",
                    "Ȳ": "Y",
                    "Ẏ": "Y",
                    "Ÿ": "Y",
                    "Ỷ": "Y",
                    "Ỵ": "Y",
                    "Ƴ": "Y",
                    "Ɏ": "Y",
                    "Ỿ": "Y",
                    "Ⓩ": "Z",
                    "Ｚ": "Z",
                    "Ź": "Z",
                    "Ẑ": "Z",
                    "Ż": "Z",
                    "Ž": "Z",
                    "Ẓ": "Z",
                    "Ẕ": "Z",
                    "Ƶ": "Z",
                    "Ȥ": "Z",
                    "Ɀ": "Z",
                    "Ⱬ": "Z",
                    "Ꝣ": "Z",
                    "ⓐ": "a",
                    "ａ": "a",
                    "ẚ": "a",
                    "à": "a",
                    "á": "a",
                    "â": "a",
                    "ầ": "a",
                    "ấ": "a",
                    "ẫ": "a",
                    "ẩ": "a",
                    "ã": "a",
                    "ā": "a",
                    "ă": "a",
                    "ằ": "a",
                    "ắ": "a",
                    "ẵ": "a",
                    "ẳ": "a",
                    "ȧ": "a",
                    "ǡ": "a",
                    "ä": "a",
                    "ǟ": "a",
                    "ả": "a",
                    "å": "a",
                    "ǻ": "a",
                    "ǎ": "a",
                    "ȁ": "a",
                    "ȃ": "a",
                    "ạ": "a",
                    "ậ": "a",
                    "ặ": "a",
                    "ḁ": "a",
                    "ą": "a",
                    "ⱥ": "a",
                    "ɐ": "a",
                    "ꜳ": "aa",
                    "æ": "ae",
                    "ǽ": "ae",
                    "ǣ": "ae",
                    "ꜵ": "ao",
                    "ꜷ": "au",
                    "ꜹ": "av",
                    "ꜻ": "av",
                    "ꜽ": "ay",
                    "ⓑ": "b",
                    "ｂ": "b",
                    "ḃ": "b",
                    "ḅ": "b",
                    "ḇ": "b",
                    "ƀ": "b",
                    "ƃ": "b",
                    "ɓ": "b",
                    "ⓒ": "c",
                    "ｃ": "c",
                    "ć": "c",
                    "ĉ": "c",
                    "ċ": "c",
                    "č": "c",
                    "ç": "c",
                    "ḉ": "c",
                    "ƈ": "c",
                    "ȼ": "c",
                    "ꜿ": "c",
                    "ↄ": "c",
                    "ⓓ": "d",
                    "ｄ": "d",
                    "ḋ": "d",
                    "ď": "d",
                    "ḍ": "d",
                    "ḑ": "d",
                    "ḓ": "d",
                    "ḏ": "d",
                    "đ": "d",
                    "ƌ": "d",
                    "ɖ": "d",
                    "ɗ": "d",
                    "ꝺ": "d",
                    "ǳ": "dz",
                    "ǆ": "dz",
                    "ⓔ": "e",
                    "ｅ": "e",
                    "è": "e",
                    "é": "e",
                    "ê": "e",
                    "ề": "e",
                    "ế": "e",
                    "ễ": "e",
                    "ể": "e",
                    "ẽ": "e",
                    "ē": "e",
                    "ḕ": "e",
                    "ḗ": "e",
                    "ĕ": "e",
                    "ė": "e",
                    "ë": "e",
                    "ẻ": "e",
                    "ě": "e",
                    "ȅ": "e",
                    "ȇ": "e",
                    "ẹ": "e",
                    "ệ": "e",
                    "ȩ": "e",
                    "ḝ": "e",
                    "ę": "e",
                    "ḙ": "e",
                    "ḛ": "e",
                    "ɇ": "e",
                    "ɛ": "e",
                    "ǝ": "e",
                    "ⓕ": "f",
                    "ｆ": "f",
                    "ḟ": "f",
                    "ƒ": "f",
                    "ꝼ": "f",
                    "ⓖ": "g",
                    "ｇ": "g",
                    "ǵ": "g",
                    "ĝ": "g",
                    "ḡ": "g",
                    "ğ": "g",
                    "ġ": "g",
                    "ǧ": "g",
                    "ģ": "g",
                    "ǥ": "g",
                    "ɠ": "g",
                    "ꞡ": "g",
                    "ᵹ": "g",
                    "ꝿ": "g",
                    "ⓗ": "h",
                    "ｈ": "h",
                    "ĥ": "h",
                    "ḣ": "h",
                    "ḧ": "h",
                    "ȟ": "h",
                    "ḥ": "h",
                    "ḩ": "h",
                    "ḫ": "h",
                    "ẖ": "h",
                    "ħ": "h",
                    "ⱨ": "h",
                    "ⱶ": "h",
                    "ɥ": "h",
                    "ƕ": "hv",
                    "ⓘ": "i",
                    "ｉ": "i",
                    "ì": "i",
                    "í": "i",
                    "î": "i",
                    "ĩ": "i",
                    "ī": "i",
                    "ĭ": "i",
                    "ï": "i",
                    "ḯ": "i",
                    "ỉ": "i",
                    "ǐ": "i",
                    "ȉ": "i",
                    "ȋ": "i",
                    "ị": "i",
                    "į": "i",
                    "ḭ": "i",
                    "ɨ": "i",
                    "ı": "i",
                    "ⓙ": "j",
                    "ｊ": "j",
                    "ĵ": "j",
                    "ǰ": "j",
                    "ɉ": "j",
                    "ⓚ": "k",
                    "ｋ": "k",
                    "ḱ": "k",
                    "ǩ": "k",
                    "ḳ": "k",
                    "ķ": "k",
                    "ḵ": "k",
                    "ƙ": "k",
                    "ⱪ": "k",
                    "ꝁ": "k",
                    "ꝃ": "k",
                    "ꝅ": "k",
                    "ꞣ": "k",
                    "ⓛ": "l",
                    "ｌ": "l",
                    "ŀ": "l",
                    "ĺ": "l",
                    "ľ": "l",
                    "ḷ": "l",
                    "ḹ": "l",
                    "ļ": "l",
                    "ḽ": "l",
                    "ḻ": "l",
                    "ſ": "l",
                    "ł": "l",
                    "ƚ": "l",
                    "ɫ": "l",
                    "ⱡ": "l",
                    "ꝉ": "l",
                    "ꞁ": "l",
                    "ꝇ": "l",
                    "ǉ": "lj",
                    "ⓜ": "m",
                    "ｍ": "m",
                    "ḿ": "m",
                    "ṁ": "m",
                    "ṃ": "m",
                    "ɱ": "m",
                    "ɯ": "m",
                    "ⓝ": "n",
                    "ｎ": "n",
                    "ǹ": "n",
                    "ń": "n",
                    "ñ": "n",
                    "ṅ": "n",
                    "ň": "n",
                    "ṇ": "n",
                    "ņ": "n",
                    "ṋ": "n",
                    "ṉ": "n",
                    "ƞ": "n",
                    "ɲ": "n",
                    "ŉ": "n",
                    "ꞑ": "n",
                    "ꞥ": "n",
                    "ǌ": "nj",
                    "ⓞ": "o",
                    "ｏ": "o",
                    "ò": "o",
                    "ó": "o",
                    "ô": "o",
                    "ồ": "o",
                    "ố": "o",
                    "ỗ": "o",
                    "ổ": "o",
                    "õ": "o",
                    "ṍ": "o",
                    "ȭ": "o",
                    "ṏ": "o",
                    "ō": "o",
                    "ṑ": "o",
                    "ṓ": "o",
                    "ŏ": "o",
                    "ȯ": "o",
                    "ȱ": "o",
                    "ö": "o",
                    "ȫ": "o",
                    "ỏ": "o",
                    "ő": "o",
                    "ǒ": "o",
                    "ȍ": "o",
                    "ȏ": "o",
                    "ơ": "o",
                    "ờ": "o",
                    "ớ": "o",
                    "ỡ": "o",
                    "ở": "o",
                    "ợ": "o",
                    "ọ": "o",
                    "ộ": "o",
                    "ǫ": "o",
                    "ǭ": "o",
                    "ø": "o",
                    "ǿ": "o",
                    "ɔ": "o",
                    "ꝋ": "o",
                    "ꝍ": "o",
                    "ɵ": "o",
                    "ƣ": "oi",
                    "ȣ": "ou",
                    "ꝏ": "oo",
                    "ⓟ": "p",
                    "ｐ": "p",
                    "ṕ": "p",
                    "ṗ": "p",
                    "ƥ": "p",
                    "ᵽ": "p",
                    "ꝑ": "p",
                    "ꝓ": "p",
                    "ꝕ": "p",
                    "ⓠ": "q",
                    "ｑ": "q",
                    "ɋ": "q",
                    "ꝗ": "q",
                    "ꝙ": "q",
                    "ⓡ": "r",
                    "ｒ": "r",
                    "ŕ": "r",
                    "ṙ": "r",
                    "ř": "r",
                    "ȑ": "r",
                    "ȓ": "r",
                    "ṛ": "r",
                    "ṝ": "r",
                    "ŗ": "r",
                    "ṟ": "r",
                    "ɍ": "r",
                    "ɽ": "r",
                    "ꝛ": "r",
                    "ꞧ": "r",
                    "ꞃ": "r",
                    "ⓢ": "s",
                    "ｓ": "s",
                    "ß": "s",
                    "ś": "s",
                    "ṥ": "s",
                    "ŝ": "s",
                    "ṡ": "s",
                    "š": "s",
                    "ṧ": "s",
                    "ṣ": "s",
                    "ṩ": "s",
                    "ș": "s",
                    "ş": "s",
                    "ȿ": "s",
                    "ꞩ": "s",
                    "ꞅ": "s",
                    "ẛ": "s",
                    "ⓣ": "t",
                    "ｔ": "t",
                    "ṫ": "t",
                    "ẗ": "t",
                    "ť": "t",
                    "ṭ": "t",
                    "ț": "t",
                    "ţ": "t",
                    "ṱ": "t",
                    "ṯ": "t",
                    "ŧ": "t",
                    "ƭ": "t",
                    "ʈ": "t",
                    "ⱦ": "t",
                    "ꞇ": "t",
                    "ꜩ": "tz",
                    "ⓤ": "u",
                    "ｕ": "u",
                    "ù": "u",
                    "ú": "u",
                    "û": "u",
                    "ũ": "u",
                    "ṹ": "u",
                    "ū": "u",
                    "ṻ": "u",
                    "ŭ": "u",
                    "ü": "u",
                    "ǜ": "u",
                    "ǘ": "u",
                    "ǖ": "u",
                    "ǚ": "u",
                    "ủ": "u",
                    "ů": "u",
                    "ű": "u",
                    "ǔ": "u",
                    "ȕ": "u",
                    "ȗ": "u",
                    "ư": "u",
                    "ừ": "u",
                    "ứ": "u",
                    "ữ": "u",
                    "ử": "u",
                    "ự": "u",
                    "ụ": "u",
                    "ṳ": "u",
                    "ų": "u",
                    "ṷ": "u",
                    "ṵ": "u",
                    "ʉ": "u",
                    "ⓥ": "v",
                    "ｖ": "v",
                    "ṽ": "v",
                    "ṿ": "v",
                    "ʋ": "v",
                    "ꝟ": "v",
                    "ʌ": "v",
                    "ꝡ": "vy",
                    "ⓦ": "w",
                    "ｗ": "w",
                    "ẁ": "w",
                    "ẃ": "w",
                    "ŵ": "w",
                    "ẇ": "w",
                    "ẅ": "w",
                    "ẘ": "w",
                    "ẉ": "w",
                    "ⱳ": "w",
                    "ⓧ": "x",
                    "ｘ": "x",
                    "ẋ": "x",
                    "ẍ": "x",
                    "ⓨ": "y",
                    "ｙ": "y",
                    "ỳ": "y",
                    "ý": "y",
                    "ŷ": "y",
                    "ỹ": "y",
                    "ȳ": "y",
                    "ẏ": "y",
                    "ÿ": "y",
                    "ỷ": "y",
                    "ẙ": "y",
                    "ỵ": "y",
                    "ƴ": "y",
                    "ɏ": "y",
                    "ỿ": "y",
                    "ⓩ": "z",
                    "ｚ": "z",
                    "ź": "z",
                    "ẑ": "z",
                    "ż": "z",
                    "ž": "z",
                    "ẓ": "z",
                    "ẕ": "z",
                    "ƶ": "z",
                    "ȥ": "z",
                    "ɀ": "z",
                    "ⱬ": "z",
                    "ꝣ": "z",
                    "Ά": "Α",
                    "Έ": "Ε",
                    "Ή": "Η",
                    "Ί": "Ι",
                    "Ϊ": "Ι",
                    "Ό": "Ο",
                    "Ύ": "Υ",
                    "Ϋ": "Υ",
                    "Ώ": "Ω",
                    "ά": "α",
                    "έ": "ε",
                    "ή": "η",
                    "ί": "ι",
                    "ϊ": "ι",
                    "ΐ": "ι",
                    "ό": "ο",
                    "ύ": "υ",
                    "ϋ": "υ",
                    "ΰ": "υ",
                    "ω": "ω",
                    "ς": "σ"
                }
            }), b.define("select2/data/base", ["../utils"], function(a) {
                function b(a, c) {
                    b.__super__.constructor.call(this)
                }
                return a.Extend(b, a.Observable), b.prototype.current = function(a) {
                    throw new Error("The `current` method must be defined in child classes.")
                }, b.prototype.query = function(a, b) {
                    throw new Error("The `query` method must be defined in child classes.")
                }, b.prototype.bind = function(a, b) {}, b.prototype.destroy = function() {}, b.prototype.generateResultId = function(b, c) {
                    var d = b.id + "-result-";
                    return d += a.generateChars(4), null != c.id ? d += "-" + c.id.toString() : d += "-" + a.generateChars(4), d
                }, b
            }), b.define("select2/data/select", ["./base", "../utils", "jquery"], function(a, b, c) {
                function d(a, b) {
                    this.$element = a, this.options = b, d.__super__.constructor.call(this)
                }
                return b.Extend(d, a), d.prototype.current = function(a) {
                    var b = [],
                        d = this;
                    this.$element.find(":selected").each(function() {
                        var a = c(this),
                            e = d.item(a);
                        b.push(e)
                    }), a(b)
                }, d.prototype.select = function(a) {
                    var b = this;
                    if (a.selected = !0, c(a.element).is("option")) return a.element.selected = !0, void this.$element.trigger("change");
                    if (this.$element.prop("multiple")) this.current(function(d) {
                        var e = [];
                        a = [a], a.push.apply(a, d);
                        for (var f = 0; f < a.length; f++) {
                            var g = a[f].id; - 1 === c.inArray(g, e) && e.push(g)
                        }
                        b.$element.val(e), b.$element.trigger("change")
                    });
                    else {
                        var d = a.id;
                        this.$element.val(d), this.$element.trigger("change")
                    }
                }, d.prototype.unselect = function(a) {
                    var b = this;
                    if (this.$element.prop("multiple")) {
                        if (a.selected = !1, c(a.element).is("option")) return a.element.selected = !1, void this.$element.trigger("change");
                        this.current(function(d) {
                            for (var e = [], f = 0; f < d.length; f++) {
                                var g = d[f].id;
                                g !== a.id && -1 === c.inArray(g, e) && e.push(g)
                            }
                            b.$element.val(e), b.$element.trigger("change")
                        })
                    }
                }, d.prototype.bind = function(a, b) {
                    var c = this;
                    this.container = a, a.on("select", function(a) {
                        c.select(a.data)
                    }), a.on("unselect", function(a) {
                        c.unselect(a.data)
                    })
                }, d.prototype.destroy = function() {
                    this.$element.find("*").each(function() {
                        b.RemoveData(this)
                    })
                }, d.prototype.query = function(a, b) {
                    var d = [],
                        e = this;
                    this.$element.children().each(function() {
                        var b = c(this);
                        if (b.is("option") || b.is("optgroup")) {
                            var f = e.item(b),
                                g = e.matches(a, f);
                            null !== g && d.push(g)
                        }
                    }), b({
                        results: d
                    })
                }, d.prototype.addOptions = function(a) {
                    b.appendMany(this.$element, a)
                }, d.prototype.option = function(a) {
                    var d;
                    a.children ? (d = document.createElement("optgroup"), d.label = a.text) : (d = document.createElement("option"), void 0 !== d.textContent ? d.textContent = a.text : d.innerText = a.text), void 0 !== a.id && (d.value = a.id), a.disabled && (d.disabled = !0), a.selected && (d.selected = !0), a.title && (d.title = a.title);
                    var e = c(d),
                        f = this._normalizeItem(a);
                    return f.element = d, b.StoreData(d, "data", f), e
                }, d.prototype.item = function(a) {
                    var d = {};
                    if (null != (d = b.GetData(a[0], "data"))) return d;
                    if (a.is("option")) d = {
                        id: a.val(),
                        text: a.text(),
                        disabled: a.prop("disabled"),
                        selected: a.prop("selected"),
                        title: a.prop("title")
                    };
                    else if (a.is("optgroup")) {
                        d = {
                            text: a.prop("label"),
                            children: [],
                            title: a.prop("title")
                        };
                        for (var e = a.children("option"), f = [], g = 0; g < e.length; g++) {
                            var h = c(e[g]),
                                i = this.item(h);
                            f.push(i)
                        }
                        d.children = f
                    }
                    return d = this._normalizeItem(d), d.element = a[0], b.StoreData(a[0], "data", d), d
                }, d.prototype._normalizeItem = function(a) {
                    a !== Object(a) && (a = {
                        id: a,
                        text: a
                    }), a = c.extend({}, {
                        text: ""
                    }, a);
                    var b = {
                        selected: !1,
                        disabled: !1
                    };
                    return null != a.id && (a.id = a.id.toString()), null != a.text && (a.text = a.text.toString()), null == a._resultId && a.id && null != this.container && (a._resultId = this.generateResultId(this.container, a)), c.extend({}, b, a)
                }, d.prototype.matches = function(a, b) {
                    return this.options.get("matcher")(a, b)
                }, d
            }), b.define("select2/data/array", ["./select", "../utils", "jquery"], function(a, b, c) {
                function d(a, b) {
                    var c = b.get("data") || [];
                    d.__super__.constructor.call(this, a, b), this.addOptions(this.convertToOptions(c))
                }
                return b.Extend(d, a), d.prototype.select = function(a) {
                    var b = this.$element.find("option").filter(function(b, c) {
                        return c.value == a.id.toString()
                    });
                    0 === b.length && (b = this.option(a), this.addOptions(b)), d.__super__.select.call(this, a)
                }, d.prototype.convertToOptions = function(a) {
                    function d(a) {
                        return function() {
                            return c(this).val() == a.id
                        }
                    }
                    for (var e = this, f = this.$element.find("option"), g = f.map(function() {
                            return e.item(c(this)).id
                        }).get(), h = [], i = 0; i < a.length; i++) {
                        var j = this._normalizeItem(a[i]);
                        if (c.inArray(j.id, g) >= 0) {
                            var k = f.filter(d(j)),
                                l = this.item(k),
                                m = c.extend(!0, {}, j, l),
                                n = this.option(m);
                            k.replaceWith(n)
                        } else {
                            var o = this.option(j);
                            if (j.children) {
                                var p = this.convertToOptions(j.children);
                                b.appendMany(o, p)
                            }
                            h.push(o)
                        }
                    }
                    return h
                }, d
            }), b.define("select2/data/ajax", ["./array", "../utils", "jquery"], function(a, b, c) {
                function d(a, b) {
                    this.ajaxOptions = this._applyDefaults(b.get("ajax")), null != this.ajaxOptions.processResults && (this.processResults = this.ajaxOptions.processResults), d.__super__.constructor.call(this, a, b)
                }
                return b.Extend(d, a), d.prototype._applyDefaults = function(a) {
                    var b = {
                        data: function(a) {
                            return c.extend({}, a, {
                                q: a.term
                            })
                        },
                        transport: function(a, b, d) {
                            var e = c.ajax(a);
                            return e.then(b), e.fail(d), e
                        }
                    };
                    return c.extend({}, b, a, !0)
                }, d.prototype.processResults = function(a) {
                    return a
                }, d.prototype.query = function(a, b) {
                    function d() {
                        var d = f.transport(f, function(d) {
                            var f = e.processResults(d, a);
                            e.options.get("debug") && window.console && console.error && (f && f.results && c.isArray(f.results) || console.error("Select2: The AJAX results did not return an array in the `results` key of the response.")), b(f)
                        }, function() {
                            "status" in d && (0 === d.status || "0" === d.status) || e.trigger("results:message", {
                                message: "errorLoading"
                            })
                        });
                        e._request = d
                    }
                    var e = this;
                    null != this._request && (c.isFunction(this._request.abort) && this._request.abort(), this._request = null);
                    var f = c.extend({
                        type: "GET"
                    }, this.ajaxOptions);
                    "function" == typeof f.url && (f.url = f.url.call(this.$element, a)), "function" == typeof f.data && (f.data = f.data.call(this.$element, a)), this.ajaxOptions.delay && null != a.term ? (this._queryTimeout && window.clearTimeout(this._queryTimeout), this._queryTimeout = window.setTimeout(d, this.ajaxOptions.delay)) : d()
                }, d
            }), b.define("select2/data/tags", ["jquery"], function(a) {
                function b(b, c, d) {
                    var e = d.get("tags"),
                        f = d.get("createTag");
                    void 0 !== f && (this.createTag = f);
                    var g = d.get("insertTag");
                    if (void 0 !== g && (this.insertTag = g), b.call(this, c, d), a.isArray(e))
                        for (var h = 0; h < e.length; h++) {
                            var i = e[h],
                                j = this._normalizeItem(i),
                                k = this.option(j);
                            this.$element.append(k)
                        }
                }
                return b.prototype.query = function(a, b, c) {
                    function d(a, f) {
                        for (var g = a.results, h = 0; h < g.length; h++) {
                            var i = g[h],
                                j = null != i.children && !d({
                                    results: i.children
                                }, !0);
                            if ((i.text || "").toUpperCase() === (b.term || "").toUpperCase() || j) return !f && (a.data = g, void c(a))
                        }
                        if (f) return !0;
                        var k = e.createTag(b);
                        if (null != k) {
                            var l = e.option(k);
                            l.attr("data-select2-tag", !0), e.addOptions([l]), e.insertTag(g, k)
                        }
                        a.results = g, c(a)
                    }
                    var e = this;
                    if (this._removeOldTags(), null == b.term || null != b.page) return void a.call(this, b, c);
                    a.call(this, b, d)
                }, b.prototype.createTag = function(b, c) {
                    var d = a.trim(c.term);
                    return "" === d ? null : {
                        id: d,
                        text: d
                    }
                }, b.prototype.insertTag = function(a, b, c) {
                    b.unshift(c)
                }, b.prototype._removeOldTags = function(b) {
                    this._lastTag;
                    this.$element.find("option[data-select2-tag]").each(function() {
                        this.selected || a(this).remove()
                    })
                }, b
            }), b.define("select2/data/tokenizer", ["jquery"], function(a) {
                function b(a, b, c) {
                    var d = c.get("tokenizer");
                    void 0 !== d && (this.tokenizer = d), a.call(this, b, c)
                }
                return b.prototype.bind = function(a, b, c) {
                    a.call(this, b, c), this.$search = b.dropdown.$search || b.selection.$search || c.find(".select2-search__field")
                }, b.prototype.query = function(b, c, d) {
                    function e(b) {
                        var c = g._normalizeItem(b);
                        if (!g.$element.find("option").filter(function() {
                                return a(this).val() === c.id
                            }).length) {
                            var d = g.option(c);
                            d.attr("data-select2-tag", !0), g._removeOldTags(), g.addOptions([d])
                        }
                        f(c)
                    }

                    function f(a) {
                        g.trigger("select", {
                            data: a
                        })
                    }
                    var g = this;
                    c.term = c.term || "";
                    var h = this.tokenizer(c, this.options, e);
                    h.term !== c.term && (this.$search.length && (this.$search.val(h.term), this.$search.focus()), c.term = h.term), b.call(this, c, d)
                }, b.prototype.tokenizer = function(b, c, d, e) {
                    for (var f = d.get("tokenSeparators") || [], g = c.term, h = 0, i = this.createTag || function(a) {
                            return {
                                id: a.term,
                                text: a.term
                            }
                        }; h < g.length;) {
                        var j = g[h];
                        if (-1 !== a.inArray(j, f)) {
                            var k = g.substr(0, h),
                                l = a.extend({}, c, {
                                    term: k
                                }),
                                m = i(l);
                            null != m ? (e(m), g = g.substr(h + 1) || "", h = 0) : h++
                        } else h++
                    }
                    return {
                        term: g
                    }
                }, b
            }), b.define("select2/data/minimumInputLength", [], function() {
                function a(a, b, c) {
                    this.minimumInputLength = c.get("minimumInputLength"), a.call(this, b, c)
                }
                return a.prototype.query = function(a, b, c) {
                    if (b.term = b.term || "", b.term.length < this.minimumInputLength) return void this.trigger("results:message", {
                        message: "inputTooShort",
                        args: {
                            minimum: this.minimumInputLength,
                            input: b.term,
                            params: b
                        }
                    });
                    a.call(this, b, c)
                }, a
            }), b.define("select2/data/maximumInputLength", [], function() {
                function a(a, b, c) {
                    this.maximumInputLength = c.get("maximumInputLength"), a.call(this, b, c)
                }
                return a.prototype.query = function(a, b, c) {
                    if (b.term = b.term || "", this.maximumInputLength > 0 && b.term.length > this.maximumInputLength) return void this.trigger("results:message", {
                        message: "inputTooLong",
                        args: {
                            maximum: this.maximumInputLength,
                            input: b.term,
                            params: b
                        }
                    });
                    a.call(this, b, c)
                }, a
            }), b.define("select2/data/maximumSelectionLength", [], function() {
                function a(a, b, c) {
                    this.maximumSelectionLength = c.get("maximumSelectionLength"), a.call(this, b, c)
                }
                return a.prototype.query = function(a, b, c) {
                    var d = this;
                    this.current(function(e) {
                        var f = null != e ? e.length : 0;
                        if (d.maximumSelectionLength > 0 && f >= d.maximumSelectionLength) return void d.trigger("results:message", {
                            message: "maximumSelected",
                            args: {
                                maximum: d.maximumSelectionLength
                            }
                        });
                        a.call(d, b, c)
                    })
                }, a
            }), b.define("select2/dropdown", ["jquery", "./utils"], function(a, b) {
                function c(a, b) {
                    this.$element = a, this.options = b, c.__super__.constructor.call(this)
                }
                return b.Extend(c, b.Observable), c.prototype.render = function() {
                    var b = a('<span class="select2-dropdown"><span class="select2-results"></span></span>');
                    return b.attr("dir", this.options.get("dir")), this.$dropdown = b, b
                }, c.prototype.bind = function() {}, c.prototype.position = function(a, b) {}, c.prototype.destroy = function() {
                    this.$dropdown.remove()
                }, c
            }), b.define("select2/dropdown/search", ["jquery", "../utils"], function(a, b) {
                function c() {}
                return c.prototype.render = function(b) {
                    var c = b.call(this),
                        d = a('<span class="select2-search select2-search--dropdown"><input class="select2-search__field" type="search" tabindex="-1" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" role="textbox" /></span>');
                    return this.$searchContainer = d, this.$search = d.find("input"), c.prepend(d), c
                }, c.prototype.bind = function(b, c, d) {
                    var e = this;
                    b.call(this, c, d), this.$search.on("keydown", function(a) {
                        e.trigger("keypress", a), e._keyUpPrevented = a.isDefaultPrevented()
                    }), this.$search.on("input", function(b) {
                        a(this).off("keyup")
                    }), this.$search.on("keyup input", function(a) {
                        e.handleSearch(a)
                    }), c.on("open", function() {
                        e.$search.attr("tabindex", 0), e.$search.focus(), window.setTimeout(function() {
                            e.$search.focus()
                        }, 0)
                    }), c.on("close", function() {
                        e.$search.attr("tabindex", -1), e.$search.val(""), e.$search.blur()
                    }), c.on("focus", function() {
                        c.isOpen() || e.$search.focus()
                    }), c.on("results:all", function(a) {
                        if (null == a.query.term || "" === a.query.term) {
                            e.showSearch(a) ? e.$searchContainer.removeClass("select2-search--hide") : e.$searchContainer.addClass("select2-search--hide")
                        }
                    })
                }, c.prototype.handleSearch = function(a) {
                    if (!this._keyUpPrevented) {
                        var b = this.$search.val();
                        this.trigger("query", {
                            term: b
                        })
                    }
                    this._keyUpPrevented = !1
                }, c.prototype.showSearch = function(a, b) {
                    return !0
                }, c
            }), b.define("select2/dropdown/hidePlaceholder", [], function() {
                function a(a, b, c, d) {
                    this.placeholder = this.normalizePlaceholder(c.get("placeholder")), a.call(this, b, c, d)
                }
                return a.prototype.append = function(a, b) {
                    b.results = this.removePlaceholder(b.results), a.call(this, b)
                }, a.prototype.normalizePlaceholder = function(a, b) {
                    return "string" == typeof b && (b = {
                        id: "",
                        text: b
                    }), b
                }, a.prototype.removePlaceholder = function(a, b) {
                    for (var c = b.slice(0), d = b.length - 1; d >= 0; d--) {
                        var e = b[d];
                        this.placeholder.id === e.id && c.splice(d, 1)
                    }
                    return c
                }, a
            }), b.define("select2/dropdown/infiniteScroll", ["jquery"], function(a) {
                function b(a, b, c, d) {
                    this.lastParams = {}, a.call(this, b, c, d), this.$loadingMore = this.createLoadingMore(), this.loading = !1
                }
                return b.prototype.append = function(a, b) {
                    this.$loadingMore.remove(), this.loading = !1, a.call(this, b), this.showLoadingMore(b) && this.$results.append(this.$loadingMore)
                }, b.prototype.bind = function(b, c, d) {
                    var e = this;
                    b.call(this, c, d), c.on("query", function(a) {
                        e.lastParams = a, e.loading = !0
                    }), c.on("query:append", function(a) {
                        e.lastParams = a, e.loading = !0
                    }), this.$results.on("scroll", function() {
                        var b = a.contains(document.documentElement, e.$loadingMore[0]);
                        if (!e.loading && b) {
                            e.$results.offset().top + e.$results.outerHeight(!1) + 50 >= e.$loadingMore.offset().top + e.$loadingMore.outerHeight(!1) && e.loadMore()
                        }
                    })
                }, b.prototype.loadMore = function() {
                    this.loading = !0;
                    var b = a.extend({}, {
                        page: 1
                    }, this.lastParams);
                    b.page++, this.trigger("query:append", b)
                }, b.prototype.showLoadingMore = function(a, b) {
                    return b.pagination && b.pagination.more
                }, b.prototype.createLoadingMore = function() {
                    var b = a('<li class="select2-results__option select2-results__option--load-more"role="treeitem" aria-disabled="true"></li>'),
                        c = this.options.get("translations").get("loadingMore");
                    return b.html(c(this.lastParams)), b
                }, b
            }), b.define("select2/dropdown/attachBody", ["jquery", "../utils"], function(a, b) {
                function c(b, c, d) {
                    this.$dropdownParent = d.get("dropdownParent") || a(document.body), b.call(this, c, d)
                }
                return c.prototype.bind = function(a, b, c) {
                    var d = this,
                        e = !1;
                    a.call(this, b, c), b.on("open", function() {
                        d._showDropdown(), d._attachPositioningHandler(b), e || (e = !0, b.on("results:all", function() {
                            d._positionDropdown(), d._resizeDropdown()
                        }), b.on("results:append", function() {
                            d._positionDropdown(), d._resizeDropdown()
                        }))
                    }), b.on("close", function() {
                        d._hideDropdown(), d._detachPositioningHandler(b)
                    }), this.$dropdownContainer.on("mousedown", function(a) {
                        a.stopPropagation()
                    })
                }, c.prototype.destroy = function(a) {
                    a.call(this), this.$dropdownContainer.remove()
                }, c.prototype.position = function(a, b, c) {
                    b.attr("class", c.attr("class")), b.removeClass("select2"), b.addClass("select2-container--open"), b.css({
                        position: "absolute",
                        top: -999999
                    }), this.$container = c
                }, c.prototype.render = function(b) {
                    var c = a("<span></span>"),
                        d = b.call(this);
                    return c.append(d), this.$dropdownContainer = c, c
                }, c.prototype._hideDropdown = function(a) {
                    this.$dropdownContainer.detach()
                }, c.prototype._attachPositioningHandler = function(c, d) {
                    var e = this,
                        f = "scroll.select2." + d.id,
                        g = "resize.select2." + d.id,
                        h = "orientationchange.select2." + d.id,
                        i = this.$container.parents().filter(b.hasScroll);
                    i.each(function() {
                        b.StoreData(this, "select2-scroll-position", {
                            x: a(this).scrollLeft(),
                            y: a(this).scrollTop()
                        })
                    }), i.on(f, function(c) {
                        var d = b.GetData(this, "select2-scroll-position");
                        a(this).scrollTop(d.y)
                    }), a(window).on(f + " " + g + " " + h, function(a) {
                        e._positionDropdown(), e._resizeDropdown()
                    })
                }, c.prototype._detachPositioningHandler = function(c, d) {
                    var e = "scroll.select2." + d.id,
                        f = "resize.select2." + d.id,
                        g = "orientationchange.select2." + d.id;
                    this.$container.parents().filter(b.hasScroll).off(e), a(window).off(e + " " + f + " " + g)
                }, c.prototype._positionDropdown = function() {
                    var b = a(window),
                        c = this.$dropdown.hasClass("select2-dropdown--above"),
                        d = this.$dropdown.hasClass("select2-dropdown--below"),
                        e = null,
                        f = this.$container.offset();
                    f.bottom = f.top + this.$container.outerHeight(!1);
                    var g = {
                        height: this.$container.outerHeight(!1)
                    };
                    g.top = f.top, g.bottom = f.top + g.height;
                    var h = {
                            height: this.$dropdown.outerHeight(!1)
                        },
                        i = {
                            top: b.scrollTop(),
                            bottom: b.scrollTop() + b.height()
                        },
                        j = i.top < f.top - h.height,
                        k = i.bottom > f.bottom + h.height,
                        l = {
                            left: f.left,
                            top: g.bottom
                        },
                        m = this.$dropdownParent;
                    "static" === m.css("position") && (m = m.offsetParent());
                    var n = m.offset();
                    l.top -= n.top, l.left -= n.left, c || d || (e = "below"), k || !j || c ? !j && k && c && (e = "below") : e = "above", ("above" == e || c && "below" !== e) && (l.top = g.top - n.top - h.height), null != e && (this.$dropdown.removeClass("select2-dropdown--below select2-dropdown--above").addClass("select2-dropdown--" + e), this.$container.removeClass("select2-container--below select2-container--above").addClass("select2-container--" + e)), this.$dropdownContainer.css(l)
                }, c.prototype._resizeDropdown = function() {
                    var a = {
                        width: this.$container.outerWidth(!1) + "px"
                    };
                    this.options.get("dropdownAutoWidth") && (a.minWidth = a.width, a.position = "relative", a.width = "auto"), this.$dropdown.css(a)
                }, c.prototype._showDropdown = function(a) {
                    this.$dropdownContainer.appendTo(this.$dropdownParent), this._positionDropdown(), this._resizeDropdown()
                }, c
            }), b.define("select2/dropdown/minimumResultsForSearch", [], function() {
                function a(b) {
                    for (var c = 0, d = 0; d < b.length; d++) {
                        var e = b[d];
                        e.children ? c += a(e.children) : c++
                    }
                    return c
                }

                function b(a, b, c, d) {
                    this.minimumResultsForSearch = c.get("minimumResultsForSearch"), this.minimumResultsForSearch < 0 && (this.minimumResultsForSearch = 1 / 0), a.call(this, b, c, d)
                }
                return b.prototype.showSearch = function(b, c) {
                    return !(a(c.data.results) < this.minimumResultsForSearch) && b.call(this, c)
                }, b
            }), b.define("select2/dropdown/selectOnClose", ["../utils"], function(a) {
                function b() {}
                return b.prototype.bind = function(a, b, c) {
                    var d = this;
                    a.call(this, b, c), b.on("close", function(a) {
                        d._handleSelectOnClose(a)
                    })
                }, b.prototype._handleSelectOnClose = function(b, c) {
                    if (c && null != c.originalSelect2Event) {
                        var d = c.originalSelect2Event;
                        if ("select" === d._type || "unselect" === d._type) return
                    }
                    var e = this.getHighlightedResults();
                    if (!(e.length < 1)) {
                        var f = a.GetData(e[0], "data");
                        null != f.element && f.element.selected || null == f.element && f.selected || this.trigger("select", {
                            data: f
                        })
                    }
                }, b
            }), b.define("select2/dropdown/closeOnSelect", [], function() {
                function a() {}
                return a.prototype.bind = function(a, b, c) {
                    var d = this;
                    a.call(this, b, c), b.on("select", function(a) {
                        d._selectTriggered(a)
                    }), b.on("unselect", function(a) {
                        d._selectTriggered(a)
                    })
                }, a.prototype._selectTriggered = function(a, b) {
                    var c = b.originalEvent;
                    c && c.ctrlKey || this.trigger("close", {
                        originalEvent: c,
                        originalSelect2Event: b
                    })
                }, a
            }), b.define("select2/i18n/en", [], function() {
                return {
                    errorLoading: function() {
                        return "The results could not be loaded."
                    },
                    inputTooLong: function(a) {
                        var b = a.input.length - a.maximum,
                            c = "Please delete " + b + " character";
                        return 1 != b && (c += "s"), c
                    },
                    inputTooShort: function(a) {
                        return "Please enter " + (a.minimum - a.input.length) + " or more characters"
                    },
                    loadingMore: function() {
                        return "Loading more results…"
                    },
                    maximumSelected: function(a) {
                        var b = "You can only select " + a.maximum + " item";
                        return 1 != a.maximum && (b += "s"), b
                    },
                    noResults: function() {
                        return "No results found"
                    },
                    searching: function() {
                        return "Searching…"
                    }
                }
            }), b.define("select2/defaults", ["jquery", "require", "./results", "./selection/single", "./selection/multiple", "./selection/placeholder", "./selection/allowClear", "./selection/search", "./selection/eventRelay", "./utils", "./translation", "./diacritics", "./data/select", "./data/array", "./data/ajax", "./data/tags", "./data/tokenizer", "./data/minimumInputLength", "./data/maximumInputLength", "./data/maximumSelectionLength", "./dropdown", "./dropdown/search", "./dropdown/hidePlaceholder", "./dropdown/infiniteScroll", "./dropdown/attachBody", "./dropdown/minimumResultsForSearch", "./dropdown/selectOnClose", "./dropdown/closeOnSelect", "./i18n/en"], function(a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s, t, u, v, w, x, y, z, A, B, C) {
                function D() {
                    this.reset()
                }
                return D.prototype.apply = function(l) {
                    if (l = a.extend(!0, {}, this.defaults, l), null == l.dataAdapter) {
                        if (null != l.ajax ? l.dataAdapter = o : null != l.data ? l.dataAdapter = n : l.dataAdapter = m, l.minimumInputLength > 0 && (l.dataAdapter = j.Decorate(l.dataAdapter, r)), l.maximumInputLength > 0 && (l.dataAdapter = j.Decorate(l.dataAdapter, s)), l.maximumSelectionLength > 0 && (l.dataAdapter = j.Decorate(l.dataAdapter, t)), l.tags && (l.dataAdapter = j.Decorate(l.dataAdapter, p)), null == l.tokenSeparators && null == l.tokenizer || (l.dataAdapter = j.Decorate(l.dataAdapter, q)), null != l.query) {
                            var C = b(l.amdBase + "compat/query");
                            l.dataAdapter = j.Decorate(l.dataAdapter, C)
                        }
                        if (null != l.initSelection) {
                            var D = b(l.amdBase + "compat/initSelection");
                            l.dataAdapter = j.Decorate(l.dataAdapter, D)
                        }
                    }
                    if (null == l.resultsAdapter && (l.resultsAdapter = c, null != l.ajax && (l.resultsAdapter = j.Decorate(l.resultsAdapter, x)), null != l.placeholder && (l.resultsAdapter = j.Decorate(l.resultsAdapter, w)), l.selectOnClose && (l.resultsAdapter = j.Decorate(l.resultsAdapter, A))), null == l.dropdownAdapter) {
                        if (l.multiple) l.dropdownAdapter = u;
                        else {
                            var E = j.Decorate(u, v);
                            l.dropdownAdapter = E
                        }
                        if (0 !== l.minimumResultsForSearch && (l.dropdownAdapter = j.Decorate(l.dropdownAdapter, z)), l.closeOnSelect && (l.dropdownAdapter = j.Decorate(l.dropdownAdapter, B)), null != l.dropdownCssClass || null != l.dropdownCss || null != l.adaptDropdownCssClass) {
                            var F = b(l.amdBase + "compat/dropdownCss");
                            l.dropdownAdapter = j.Decorate(l.dropdownAdapter, F)
                        }
                        l.dropdownAdapter = j.Decorate(l.dropdownAdapter, y)
                    }
                    if (null == l.selectionAdapter) {
                        if (l.multiple ? l.selectionAdapter = e : l.selectionAdapter = d, null != l.placeholder && (l.selectionAdapter = j.Decorate(l.selectionAdapter, f)), l.allowClear && (l.selectionAdapter = j.Decorate(l.selectionAdapter, g)), l.multiple && (l.selectionAdapter = j.Decorate(l.selectionAdapter, h)), null != l.containerCssClass || null != l.containerCss || null != l.adaptContainerCssClass) {
                            var G = b(l.amdBase + "compat/containerCss");
                            l.selectionAdapter = j.Decorate(l.selectionAdapter, G)
                        }
                        l.selectionAdapter = j.Decorate(l.selectionAdapter, i)
                    }
                    if ("string" == typeof l.language)
                        if (l.language.indexOf("-") > 0) {
                            var H = l.language.split("-"),
                                I = H[0];
                            l.language = [l.language, I]
                        } else l.language = [l.language];
                    if (a.isArray(l.language)) {
                        var J = new k;
                        l.language.push("en");
                        for (var K = l.language, L = 0; L < K.length; L++) {
                            var M = K[L],
                                N = {};
                            try {
                                N = k.loadPath(M)
                            } catch (a) {
                                try {
                                    M = this.defaults.amdLanguageBase + M, N = k.loadPath(M)
                                } catch (a) {
                                    l.debug && window.console && console.warn && console.warn('Select2: The language file for "' + M + '" could not be automatically loaded. A fallback will be used instead.');
                                    continue
                                }
                            }
                            J.extend(N)
                        }
                        l.translations = J
                    } else {
                        var O = k.loadPath(this.defaults.amdLanguageBase + "en"),
                            P = new k(l.language);
                        P.extend(O), l.translations = P
                    }
                    return l
                }, D.prototype.reset = function() {
                    function b(a) {
                        function b(a) {
                            return l[a] || a
                        }
                        return a.replace(/[^\u0000-\u007E]/g, b)
                    }

                    function c(d, e) {
                        if ("" === a.trim(d.term)) return e;
                        if (e.children && e.children.length > 0) {
                            for (var f = a.extend(!0, {}, e), g = e.children.length - 1; g >= 0; g--) {
                                null == c(d, e.children[g]) && f.children.splice(g, 1)
                            }
                            return f.children.length > 0 ? f : c(d, f)
                        }
                        var h = b(e.text).toUpperCase(),
                            i = b(d.term).toUpperCase();
                        return h.indexOf(i) > -1 ? e : null
                    }
                    this.defaults = {
                        amdBase: "./",
                        amdLanguageBase: "./i18n/",
                        closeOnSelect: !0,
                        debug: !1,
                        dropdownAutoWidth: !1,
                        escapeMarkup: j.escapeMarkup,
                        language: C,
                        matcher: c,
                        minimumInputLength: 0,
                        maximumInputLength: 0,
                        maximumSelectionLength: 0,
                        minimumResultsForSearch: 0,
                        selectOnClose: !1,
                        sorter: function(a) {
                            return a
                        },
                        templateResult: function(a) {
                            return a.text
                        },
                        templateSelection: function(a) {
                            return a.text
                        },
                        theme: "default",
                        width: "resolve"
                    }
                }, D.prototype.set = function(b, c) {
                    var d = a.camelCase(b),
                        e = {};
                    e[d] = c;
                    var f = j._convertData(e);
                    a.extend(!0, this.defaults, f)
                }, new D
            }), b.define("select2/options", ["require", "jquery", "./defaults", "./utils"], function(a, b, c, d) {
                function e(b, e) {
                    if (this.options = b, null != e && this.fromElement(e), this.options = c.apply(this.options), e && e.is("input")) {
                        var f = a(this.get("amdBase") + "compat/inputData");
                        this.options.dataAdapter = d.Decorate(this.options.dataAdapter, f)
                    }
                }
                return e.prototype.fromElement = function(a) {
                    var c = ["select2"];
                    null == this.options.multiple && (this.options.multiple = a.prop("multiple")), null == this.options.disabled && (this.options.disabled = a.prop("disabled")), null == this.options.language && (a.prop("lang") ? this.options.language = a.prop("lang").toLowerCase() : a.closest("[lang]").prop("lang") && (this.options.language = a.closest("[lang]").prop("lang"))), null == this.options.dir && (a.prop("dir") ? this.options.dir = a.prop("dir") : a.closest("[dir]").prop("dir") ? this.options.dir = a.closest("[dir]").prop("dir") : this.options.dir = "ltr"), a.prop("disabled", this.options.disabled), a.prop("multiple", this.options.multiple), d.GetData(a[0], "select2Tags") && (this.options.debug && window.console && console.warn && console.warn('Select2: The `data-select2-tags` attribute has been changed to use the `data-data` and `data-tags="true"` attributes and will be removed in future versions of Select2.'), d.StoreData(a[0], "data", d.GetData(a[0], "select2Tags")), d.StoreData(a[0], "tags", !0)), d.GetData(a[0], "ajaxUrl") && (this.options.debug && window.console && console.warn && console.warn("Select2: The `data-ajax-url` attribute has been changed to `data-ajax--url` and support for the old attribute will be removed in future versions of Select2."), a.attr("ajax--url", d.GetData(a[0], "ajaxUrl")), d.StoreData(a[0], "ajax-Url", d.GetData(a[0], "ajaxUrl")));
                    var e = {};
                    e = b.fn.jquery && "1." == b.fn.jquery.substr(0, 2) && a[0].dataset ? b.extend(!0, {}, a[0].dataset, d.GetData(a[0])) : d.GetData(a[0]);
                    var f = b.extend(!0, {}, e);
                    f = d._convertData(f);
                    for (var g in f) b.inArray(g, c) > -1 || (b.isPlainObject(this.options[g]) ? b.extend(this.options[g], f[g]) : this.options[g] = f[g]);
                    return this
                }, e.prototype.get = function(a) {
                    return this.options[a]
                }, e.prototype.set = function(a, b) {
                    this.options[a] = b
                }, e
            }), b.define("select2/core", ["jquery", "./options", "./utils", "./keys"], function(a, b, c, d) {
                var e = function(a, d) {
                    null != c.GetData(a[0], "select2") && c.GetData(a[0], "select2").destroy(), this.$element = a, this.id = this._generateId(a), d = d || {}, this.options = new b(d, a), e.__super__.constructor.call(this);
                    var f = a.attr("tabindex") || 0;
                    c.StoreData(a[0], "old-tabindex", f), a.attr("tabindex", "-1");
                    var g = this.options.get("dataAdapter");
                    this.dataAdapter = new g(a, this.options);
                    var h = this.render();
                    this._placeContainer(h);
                    var i = this.options.get("selectionAdapter");
                    this.selection = new i(a, this.options), this.$selection = this.selection.render(), this.selection.position(this.$selection, h);
                    var j = this.options.get("dropdownAdapter");
                    this.dropdown = new j(a, this.options), this.$dropdown = this.dropdown.render(), this.dropdown.position(this.$dropdown, h);
                    var k = this.options.get("resultsAdapter");
                    this.results = new k(a, this.options, this.dataAdapter), this.$results = this.results.render(), this.results.position(this.$results, this.$dropdown);
                    var l = this;
                    this._bindAdapters(), this._registerDomEvents(), this._registerDataEvents(), this._registerSelectionEvents(), this._registerDropdownEvents(), this._registerResultsEvents(), this._registerEvents(), this.dataAdapter.current(function(a) {
                        l.trigger("selection:update", {
                            data: a
                        })
                    }), a.addClass("select2-hidden-accessible"), a.attr("aria-hidden", "true"), this._syncAttributes(), c.StoreData(a[0], "select2", this)
                };
                return c.Extend(e, c.Observable), e.prototype._generateId = function(a) {
                    var b = "";
                    return b = null != a.attr("id") ? a.attr("id") : null != a.attr("name") ? a.attr("name") + "-" + c.generateChars(2) : c.generateChars(4), b = b.replace(/(:|\.|\[|\]|,)/g, ""), b = "select2-" + b
                }, e.prototype._placeContainer = function(a) {
                    a.insertAfter(this.$element);
                    var b = this._resolveWidth(this.$element, this.options.get("width"));
                    null != b && a.css("width", b)
                }, e.prototype._resolveWidth = function(a, b) {
                    var c = /^width:(([-+]?([0-9]*\.)?[0-9]+)(px|em|ex|%|in|cm|mm|pt|pc))/i;
                    if ("resolve" == b) {
                        var d = this._resolveWidth(a, "style");
                        return null != d ? d : this._resolveWidth(a, "element")
                    }
                    if ("element" == b) {
                        var e = a.outerWidth(!1);
                        return e <= 0 ? "auto" : e + "px"
                    }
                    if ("style" == b) {
                        var f = a.attr("style");
                        if ("string" != typeof f) return null;
                        for (var g = f.split(";"), h = 0, i = g.length; h < i; h += 1) {
                            var j = g[h].replace(/\s/g, ""),
                                k = j.match(c);
                            if (null !== k && k.length >= 1) return k[1]
                        }
                        return null
                    }
                    return b
                }, e.prototype._bindAdapters = function() {
                    this.dataAdapter.bind(this, this.$container), this.selection.bind(this, this.$container), this.dropdown.bind(this, this.$container), this.results.bind(this, this.$container)
                }, e.prototype._registerDomEvents = function() {
                    var b = this;
                    this.$element.on("change.select2", function() {
                        b.dataAdapter.current(function(a) {
                            b.trigger("selection:update", {
                                data: a
                            })
                        })
                    }), this.$element.on("focus.select2", function(a) {
                        b.trigger("focus", a)
                    }), this._syncA = c.bind(this._syncAttributes, this), this._syncS = c.bind(this._syncSubtree, this), this.$element[0].attachEvent && this.$element[0].attachEvent("onpropertychange", this._syncA);
                    var d = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
                    null != d ? (this._observer = new d(function(c) {
                        a.each(c, b._syncA), a.each(c, b._syncS)
                    }), this._observer.observe(this.$element[0], {
                        attributes: !0,
                        childList: !0,
                        subtree: !1
                    })) : this.$element[0].addEventListener && (this.$element[0].addEventListener("DOMAttrModified", b._syncA, !1), this.$element[0].addEventListener("DOMNodeInserted", b._syncS, !1), this.$element[0].addEventListener("DOMNodeRemoved", b._syncS, !1))
                }, e.prototype._registerDataEvents = function() {
                    var a = this;
                    this.dataAdapter.on("*", function(b, c) {
                        a.trigger(b, c)
                    })
                }, e.prototype._registerSelectionEvents = function() {
                    var b = this,
                        c = ["toggle", "focus"];
                    this.selection.on("toggle", function() {
                        b.toggleDropdown()
                    }), this.selection.on("focus", function(a) {
                        b.focus(a)
                    }), this.selection.on("*", function(d, e) {
                        -1 === a.inArray(d, c) && b.trigger(d, e)
                    })
                }, e.prototype._registerDropdownEvents = function() {
                    var a = this;
                    this.dropdown.on("*", function(b, c) {
                        a.trigger(b, c)
                    })
                }, e.prototype._registerResultsEvents = function() {
                    var a = this;
                    this.results.on("*", function(b, c) {
                        a.trigger(b, c)
                    })
                }, e.prototype._registerEvents = function() {
                    var a = this;
                    this.on("open", function() {
                        a.$container.addClass("select2-container--open")
                    }), this.on("close", function() {
                        a.$container.removeClass("select2-container--open")
                    }), this.on("enable", function() {
                        a.$container.removeClass("select2-container--disabled")
                    }), this.on("disable", function() {
                        a.$container.addClass("select2-container--disabled")
                    }), this.on("blur", function() {
                        a.$container.removeClass("select2-container--focus")
                    }), this.on("query", function(b) {
                        a.isOpen() || a.trigger("open", {}), this.dataAdapter.query(b, function(c) {
                            a.trigger("results:all", {
                                data: c,
                                query: b
                            })
                        })
                    }), this.on("query:append", function(b) {
                        this.dataAdapter.query(b, function(c) {
                            a.trigger("results:append", {
                                data: c,
                                query: b
                            })
                        })
                    }), this.on("keypress", function(b) {
                        var c = b.which;
                        a.isOpen() ? c === d.ESC || c === d.TAB || c === d.UP && b.altKey ? (a.close(), b.preventDefault()) : c === d.ENTER ? (a.trigger("results:select", {}), b.preventDefault()) : c === d.SPACE && b.ctrlKey ? (a.trigger("results:toggle", {}), b.preventDefault()) : c === d.UP ? (a.trigger("results:previous", {}), b.preventDefault()) : c === d.DOWN && (a.trigger("results:next", {}), b.preventDefault()) : (c === d.ENTER || c === d.SPACE || c === d.DOWN && b.altKey) && (a.open(), b.preventDefault())
                    })
                }, e.prototype._syncAttributes = function() {
                    this.options.set("disabled", this.$element.prop("disabled")), this.options.get("disabled") ? (this.isOpen() && this.close(), this.trigger("disable", {})) : this.trigger("enable", {})
                }, e.prototype._syncSubtree = function(a, b) {
                    var c = !1,
                        d = this;
                    if (!a || !a.target || "OPTION" === a.target.nodeName || "OPTGROUP" === a.target.nodeName) {
                        if (b)
                            if (b.addedNodes && b.addedNodes.length > 0)
                                for (var e = 0; e < b.addedNodes.length; e++) {
                                    var f = b.addedNodes[e];
                                    f.selected && (c = !0)
                                } else b.removedNodes && b.removedNodes.length > 0 && (c = !0);
                            else c = !0;
                        c && this.dataAdapter.current(function(a) {
                            d.trigger("selection:update", {
                                data: a
                            })
                        })
                    }
                }, e.prototype.trigger = function(a, b) {
                    var c = e.__super__.trigger,
                        d = {
                            open: "opening",
                            close: "closing",
                            select: "selecting",
                            unselect: "unselecting",
                            clear: "clearing"
                        };
                    if (void 0 === b && (b = {}), a in d) {
                        var f = d[a],
                            g = {
                                prevented: !1,
                                name: a,
                                args: b
                            };
                        if (c.call(this, f, g), g.prevented) return void(b.prevented = !0)
                    }
                    c.call(this, a, b)
                }, e.prototype.toggleDropdown = function() {
                    this.options.get("disabled") || (this.isOpen() ? this.close() : this.open())
                }, e.prototype.open = function() {
                    this.isOpen() || this.trigger("query", {})
                }, e.prototype.close = function() {
                    this.isOpen() && this.trigger("close", {})
                }, e.prototype.isOpen = function() {
                    return this.$container.hasClass("select2-container--open")
                }, e.prototype.hasFocus = function() {
                    return this.$container.hasClass("select2-container--focus")
                }, e.prototype.focus = function(a) {
                    this.hasFocus() || (this.$container.addClass("select2-container--focus"), this.trigger("focus", {}))
                }, e.prototype.enable = function(a) {
                    this.options.get("debug") && window.console && console.warn && console.warn('Select2: The `select2("enable")` method has been deprecated and will be removed in later Select2 versions. Use $element.prop("disabled") instead.'), null != a && 0 !== a.length || (a = [!0]);
                    var b = !a[0];
                    this.$element.prop("disabled", b)
                }, e.prototype.data = function() {
                    this.options.get("debug") && arguments.length > 0 && window.console && console.warn && console.warn('Select2: Data can no longer be set using `select2("data")`. You should consider setting the value instead using `$element.val()`.');
                    var a = [];
                    return this.dataAdapter.current(function(b) {
                        a = b
                    }), a
                }, e.prototype.val = function(b) {
                    if (this.options.get("debug") && window.console && console.warn && console.warn('Select2: The `select2("val")` method has been deprecated and will be removed in later Select2 versions. Use $element.val() instead.'), null == b || 0 === b.length) return this.$element.val();
                    var c = b[0];
                    a.isArray(c) && (c = a.map(c, function(a) {
                        return a.toString()
                    })), this.$element.val(c).trigger("change")
                }, e.prototype.destroy = function() {
                    this.$container.remove(), this.$element[0].detachEvent && this.$element[0].detachEvent("onpropertychange", this._syncA), null != this._observer ? (this._observer.disconnect(), this._observer = null) : this.$element[0].removeEventListener && (this.$element[0].removeEventListener("DOMAttrModified", this._syncA, !1), this.$element[0].removeEventListener("DOMNodeInserted", this._syncS, !1), this.$element[0].removeEventListener("DOMNodeRemoved", this._syncS, !1)), this._syncA = null, this._syncS = null, this.$element.off(".select2"), this.$element.attr("tabindex", c.GetData(this.$element[0], "old-tabindex")), this.$element.removeClass("select2-hidden-accessible"), this.$element.attr("aria-hidden", "false"), c.RemoveData(this.$element[0]), this.dataAdapter.destroy(), this.selection.destroy(), this.dropdown.destroy(), this.results.destroy(), this.dataAdapter = null, this.selection = null, this.dropdown = null, this.results = null
                }, e.prototype.render = function() {
                    var b = a('<span class="select2 select2-container"><span class="selection" style="width: 190px;"></span><span class="dropdown-wrapper" aria-hidden="true"></span></span>');
                    return b.attr("dir", this.options.get("dir")), this.$container = b, this.$container.addClass("select2-container--" + this.options.get("theme")), c.StoreData(b[0], "element", this.$element), b
                }, e
            }), b.define("jquery-mousewheel", ["jquery"], function(a) {
                return a
            }), b.define("jquery.select2", ["jquery", "jquery-mousewheel", "./select2/core", "./select2/defaults", "./select2/utils"], function(a, b, c, d, e) {
                if (null == a.fn.select2) {
                    var f = ["open", "close", "destroy"];
                    a.fn.select2 = function(b) {
                        if ("object" == typeof(b = b || {})) return this.each(function() {
                            var d = a.extend(!0, {}, b);
                            new c(a(this), d)
                        }), this;
                        if ("string" == typeof b) {
                            var d, g = Array.prototype.slice.call(arguments, 1);
                            return this.each(function() {
                                var a = e.GetData(this, "select2");
                                null == a && window.console && console.error && console.error("The select2('" + b + "') method was called on an element that is not using Select2."), d = a[b].apply(a, g)
                            }), a.inArray(b, f) > -1 ? this : d
                        }
                        throw new Error("Invalid arguments for Select2: " + b)
                    }
                }
                return null == a.fn.select2.defaults && (a.fn.select2.defaults = d), c
            }), {
                define: b.define,
                require: b.require
            }
        }(),
        c = b.require("jquery.select2");
    return a.fn.select2.amd = b, c
});;

jQuery(function(){
  //update url on views exposed filter block for about you
  jQuery("#views-exposed-form-about-you-block-1").attr("action", "/about-you");
  //update webform on hompage to redirect to user registration form
  jQuery("#webform-submission-mobile-number-node-7-add-form").attr("action", "/user/register");
  jQuery("#webform-submission-mobile-number-node-7-add-form").attr("method", "get");

  //add active class on user menu
  var path = window.location.pathname;
  var url = path.split('/');
  if(url[1] == 'user') {
    //dashboard
    if(url[1] == 'user' && url[3] == 'edit') {

      jQuery('ul.menu--user-menu li').slice(2,3).addClass('active');

    } else  if(url[1] == 'user' && url[3] == 'reminders') { //account profile

      jQuery('ul.menu--user-menu li').slice(1,2).addClass('active');

    } else if( url[1] == 'user' ) {

      jQuery('ul.menu--user-menu li').slice(0,1).addClass('active');

    }
  }

  if(path = '/user/register') {
    var mobile_param = getUrlParameter("mobile_number");
    if(mobile_param != '') {
      jQuery('input[name*="field_phone_number[0][value]"]').val(mobile_param);
    }

  }
  function getUrlParameter(search_param){
    // get string of paramters
    var url_part = window.location.search.substring(1);
    // decode string
    var decoded_url_part = decodeURIComponent(url_part);
    // split on the basis of "&"
    var params = decoded_url_part.split('&');

    //iterate throw each param and find if it matches required component
    for(i = 0; i < params.length; i++){
      param = params[i].split('=');
      if(search_param == param[0]){
        return param[1];
      } else {
        return '';
      }
    }
  }

});
;
/**
* DO NOT EDIT THIS FILE.
* See the following change record for more information,
* https://www.drupal.org/node/2815083
* @preserve
**/

(function ($, Drupal) {
  var states = {
    postponed: []
  };

  Drupal.states = states;

  function invert(a, invertState) {
    return invertState && typeof a !== 'undefined' ? !a : a;
  }

  function _compare2(a, b) {
    if (a === b) {
      return typeof a === 'undefined' ? a : true;
    }

    return typeof a === 'undefined' || typeof b === 'undefined';
  }

  function ternary(a, b) {
    if (typeof a === 'undefined') {
      return b;
    }
    if (typeof b === 'undefined') {
      return a;
    }

    return a && b;
  }

  Drupal.behaviors.states = {
    attach: function attach(context, settings) {
      var $states = $(context).find('[data-drupal-states]');
      var il = $states.length;

      var _loop = function _loop(i) {
        var config = JSON.parse($states[i].getAttribute('data-drupal-states'));
        Object.keys(config || {}).forEach(function (state) {
          new states.Dependent({
            element: $($states[i]),
            state: states.State.sanitize(state),
            constraints: config[state]
          });
        });
      };

      for (var i = 0; i < il; i++) {
        _loop(i);
      }

      while (states.postponed.length) {
        states.postponed.shift()();
      }
    }
  };

  states.Dependent = function (args) {
    var _this = this;

    $.extend(this, { values: {}, oldValue: null }, args);

    this.dependees = this.getDependees();
    Object.keys(this.dependees || {}).forEach(function (selector) {
      _this.initializeDependee(selector, _this.dependees[selector]);
    });
  };

  states.Dependent.comparisons = {
    RegExp: function RegExp(reference, value) {
      return reference.test(value);
    },
    Function: function Function(reference, value) {
      return reference(value);
    },
    Number: function Number(reference, value) {
      return typeof value === 'string' ? _compare2(reference.toString(), value) : _compare2(reference, value);
    }
  };

  states.Dependent.prototype = {
    initializeDependee: function initializeDependee(selector, dependeeStates) {
      var _this2 = this;

      this.values[selector] = {};

      Object.keys(dependeeStates).forEach(function (i) {
        var state = dependeeStates[i];

        if ($.inArray(state, dependeeStates) === -1) {
          return;
        }

        state = states.State.sanitize(state);

        _this2.values[selector][state.name] = null;

        $(selector).on('state:' + state, { selector: selector, state: state }, function (e) {
          _this2.update(e.data.selector, e.data.state, e.value);
        });

        new states.Trigger({ selector: selector, state: state });
      });
    },
    compare: function compare(reference, selector, state) {
      var value = this.values[selector][state.name];
      if (reference.constructor.name in states.Dependent.comparisons) {
        return states.Dependent.comparisons[reference.constructor.name](reference, value);
      }

      return _compare2(reference, value);
    },
    update: function update(selector, state, value) {
      if (value !== this.values[selector][state.name]) {
        this.values[selector][state.name] = value;
        this.reevaluate();
      }
    },
    reevaluate: function reevaluate() {
      var value = this.verifyConstraints(this.constraints);

      if (value !== this.oldValue) {
        this.oldValue = value;

        value = invert(value, this.state.invert);

        this.element.trigger({
          type: 'state:' + this.state,
          value: value,
          trigger: true
        });
      }
    },
    verifyConstraints: function verifyConstraints(constraints, selector) {
      var result = void 0;
      if ($.isArray(constraints)) {
        var hasXor = $.inArray('xor', constraints) === -1;
        var len = constraints.length;
        for (var i = 0; i < len; i++) {
          if (constraints[i] !== 'xor') {
            var constraint = this.checkConstraints(constraints[i], selector, i);

            if (constraint && (hasXor || result)) {
              return hasXor;
            }
            result = result || constraint;
          }
        }
      } else if ($.isPlainObject(constraints)) {
          for (var n in constraints) {
            if (constraints.hasOwnProperty(n)) {
              result = ternary(result, this.checkConstraints(constraints[n], selector, n));

              if (result === false) {
                return false;
              }
            }
          }
        }
      return result;
    },
    checkConstraints: function checkConstraints(value, selector, state) {
      if (typeof state !== 'string' || /[0-9]/.test(state[0])) {
        state = null;
      } else if (typeof selector === 'undefined') {
        selector = state;
        state = null;
      }

      if (state !== null) {
        state = states.State.sanitize(state);
        return invert(this.compare(value, selector, state), state.invert);
      }

      return this.verifyConstraints(value, selector);
    },
    getDependees: function getDependees() {
      var cache = {};

      var _compare = this.compare;
      this.compare = function (reference, selector, state) {
        (cache[selector] || (cache[selector] = [])).push(state.name);
      };

      this.verifyConstraints(this.constraints);

      this.compare = _compare;

      return cache;
    }
  };

  states.Trigger = function (args) {
    $.extend(this, args);

    if (this.state in states.Trigger.states) {
      this.element = $(this.selector);

      if (!this.element.data('trigger:' + this.state)) {
        this.initialize();
      }
    }
  };

  states.Trigger.prototype = {
    initialize: function initialize() {
      var _this3 = this;

      var trigger = states.Trigger.states[this.state];

      if (typeof trigger === 'function') {
        trigger.call(window, this.element);
      } else {
        Object.keys(trigger || {}).forEach(function (event) {
          _this3.defaultTrigger(event, trigger[event]);
        });
      }

      this.element.data('trigger:' + this.state, true);
    },
    defaultTrigger: function defaultTrigger(event, valueFn) {
      var oldValue = valueFn.call(this.element);

      this.element.on(event, $.proxy(function (e) {
        var value = valueFn.call(this.element, e);

        if (oldValue !== value) {
          this.element.trigger({
            type: 'state:' + this.state,
            value: value,
            oldValue: oldValue
          });
          oldValue = value;
        }
      }, this));

      states.postponed.push($.proxy(function () {
        this.element.trigger({
          type: 'state:' + this.state,
          value: oldValue,
          oldValue: null
        });
      }, this));
    }
  };

  states.Trigger.states = {
    empty: {
      keyup: function keyup() {
        return this.val() === '';
      }
    },

    checked: {
      change: function change() {
        var checked = false;
        this.each(function () {
          checked = $(this).prop('checked');

          return !checked;
        });
        return checked;
      }
    },

    value: {
      keyup: function keyup() {
        if (this.length > 1) {
          return this.filter(':checked').val() || false;
        }
        return this.val();
      },
      change: function change() {
        if (this.length > 1) {
          return this.filter(':checked').val() || false;
        }
        return this.val();
      }
    },

    collapsed: {
      collapsed: function collapsed(e) {
        return typeof e !== 'undefined' && 'value' in e ? e.value : !this.is('[open]');
      }
    }
  };

  states.State = function (state) {
    this.pristine = state;
    this.name = state;

    var process = true;
    do {
      while (this.name.charAt(0) === '!') {
        this.name = this.name.substring(1);
        this.invert = !this.invert;
      }

      if (this.name in states.State.aliases) {
        this.name = states.State.aliases[this.name];
      } else {
        process = false;
      }
    } while (process);
  };

  states.State.sanitize = function (state) {
    if (state instanceof states.State) {
      return state;
    }

    return new states.State(state);
  };

  states.State.aliases = {
    enabled: '!disabled',
    invisible: '!visible',
    invalid: '!valid',
    untouched: '!touched',
    optional: '!required',
    filled: '!empty',
    unchecked: '!checked',
    irrelevant: '!relevant',
    expanded: '!collapsed',
    open: '!collapsed',
    closed: 'collapsed',
    readwrite: '!readonly'
  };

  states.State.prototype = {
    invert: false,

    toString: function toString() {
      return this.name;
    }
  };

  var $document = $(document);
  $document.on('state:disabled', function (e) {
    if (e.trigger) {
      $(e.target).prop('disabled', e.value).closest('.js-form-item, .js-form-submit, .js-form-wrapper').toggleClass('form-disabled', e.value).find('select, input, textarea').prop('disabled', e.value);
    }
  });

  $document.on('state:required', function (e) {
    if (e.trigger) {
      if (e.value) {
        var label = 'label' + (e.target.id ? '[for=' + e.target.id + ']' : '');
        var $label = $(e.target).attr({ required: 'required', 'aria-required': 'true' }).closest('.js-form-item, .js-form-wrapper').find(label);

        if (!$label.hasClass('js-form-required').length) {
          $label.addClass('js-form-required form-required');
        }
      } else {
        $(e.target).removeAttr('required aria-required').closest('.js-form-item, .js-form-wrapper').find('label.js-form-required').removeClass('js-form-required form-required');
      }
    }
  });

  $document.on('state:visible', function (e) {
    if (e.trigger) {
      $(e.target).closest('.js-form-item, .js-form-submit, .js-form-wrapper').toggle(e.value);
    }
  });

  $document.on('state:checked', function (e) {
    if (e.trigger) {
      $(e.target).prop('checked', e.value);
    }
  });

  $document.on('state:collapsed', function (e) {
    if (e.trigger) {
      if ($(e.target).is('[open]') === e.value) {
        $(e.target).find('> summary').trigger('click');
      }
    }
  });
})(jQuery, Drupal);;
/**
 * @file
 * Extends core/misc/states.js.
 */
(function($) {

  // Unbind core state.js from document first so we can then override below.
  $(document).unbind('state:disabled');

  /**
   * Global state change handlers. These are bound to "document" to cover all
   * elements whose state changes. Events sent to elements within the page
   * bubble up to these handlers. We use this system so that themes and modules
   * can override these state change handlers for particular parts of a page.
   */
  $(document).bind('state:disabled', function(e) {
    // Only act when this change was triggered by a dependency and not by the
    // element monitoring itself.
    if (e.trigger) {
      $(e.target)
        .attr('disabled', e.value)
        .closest('.form-item, .form-submit, .form-wrapper').toggleClass('form-disabled', e.value)
        .find(':input').attr('disabled', e.value);

      // Note: WebKit nightlies don't reflect that change correctly.
      // See https://bugs.webkit.org/show_bug.cgi?id=23789
    }
  });

})(jQuery);
;
/**
 * @file
 * JavaScript behaviors for custom webform #states.
 */

(function ($, Drupal) {

  'use strict';

  Drupal.webform = Drupal.webform || {};
  Drupal.webform.states = Drupal.webform.states || {};
  Drupal.webform.states.slideDown = Drupal.webform.states.slideDown || {};
  Drupal.webform.states.slideDown.duration = 'slow';
  Drupal.webform.states.slideUp = Drupal.webform.states.slideUp || {};
  Drupal.webform.states.slideUp.duration = 'fast';

  /**
   * Check if an element has a specified data attribute.
   *
   * @param {string} data
   *   The data attribute name.
   *
   * @return {boolean}
   *   TRUE if an element has a specified data attribute.
   */
  $.fn.hasData = function (data) {
    return (typeof this.data(data) !== 'undefined');
  };

  /**
   * Check if element is within the webform or not.
   *
   * @return {boolean}
   *   TRUE if element is within the webform.
   */
  $.fn.isWebform = function () {
    return $(this).closest('form[id^="webform"]').length ? true : false;
  };

  // The change event is triggered by cut-n-paste and select menus.
  // Issue #2445271: #states element empty check not triggered on mouse
  // based paste.
  // @see https://www.drupal.org/node/2445271
  Drupal.states.Trigger.states.empty.change = function change() {
    return this.val() === '';
  };

  // Apply solution included in #1962800 patch.
  // Issue #1962800: Form #states not working with literal integers as
  // values in IE11.
  // @see https://www.drupal.org/project/drupal/issues/1962800
  // @see https://www.drupal.org/files/issues/core-states-not-working-with-integers-ie11_1962800_46.patch
  //
  // This issue causes pattern, less than, and greater than support to break.
  // @see https://www.drupal.org/project/webform/issues/2981724
  var states = Drupal.states;
  Drupal.states.Dependent.prototype.compare = function compare(reference, selector, state) {
    var value = this.values[selector][state.name];

    var name = reference.constructor.name;
    if (!name) {
      name = $.type(reference);

      name = name.charAt(0).toUpperCase() + name.slice(1);
    }
    if (name in states.Dependent.comparisons) {
      return states.Dependent.comparisons[name](reference, value);
    }

    if (reference.constructor.name in states.Dependent.comparisons) {
      return states.Dependent.comparisons[reference.constructor.name](reference, value);
    }

    return _compare2(reference, value);
  };
  function _compare2(a, b) {
    if (a === b) {
      return typeof a === 'undefined' ? a : true;
    }

    return typeof a === 'undefined' || typeof b === 'undefined';
  }

  // Adds pattern, less than, and greater than support to #state API.
  // @see http://drupalsun.com/julia-evans/2012/03/09/extending-form-api-states-regular-expressions
  Drupal.states.Dependent.comparisons.Object = function (reference, value) {
    if ('pattern' in reference) {
      return (new RegExp(reference['pattern'])).test(value);
    }
    else if ('!pattern' in reference) {
      return !((new RegExp(reference['!pattern'])).test(value));
    }
    else if ('less' in reference) {
      return (value !== '' && parseFloat(reference['less']) > parseFloat(value));
    }
    else if ('greater' in reference) {
      return (value !== '' && parseFloat(reference['greater']) < parseFloat(value));
    }
    else {
      return reference.indexOf(value) !== false;
    }
  };

  var $document = $(document);

  $document.on('state:required', function (e) {
    if (e.trigger && $(e.target).isWebform()) {
      var $target = $(e.target);
      // Fix #required file upload.
      // @see Issue #2860529: Conditional required File upload field don't work.
      if (e.value) {
        $target.find('input[type="file"]').attr({'required': 'required', 'aria-required': 'true'});
      }
      else {
        $target.find('input[type="file"]').removeAttr('required aria-required');
      }

      // Fix required label for checkboxes and radios.
      // @see Issue #2938414: Checkboxes don't support #states required
      // @see Issue #2731991: Setting required on radios marks all options required.
      // @see Issue #2856315: Conditional Logic - Requiring Radios in a Fieldset.
      // Fix #required for fieldsets.
      // @see Issue #2977569: Hidden fieldsets that become visible with conditional logic cannot be made required.
      if ($target.is('.js-webform-type-radios, .js-webform-type-checkboxes, fieldset')) {
        if (e.value) {
          $target.find('legend span.fieldset-legend:not(.visually-hidden)').addClass('js-form-required form-required');
        }
        else {
          $target.find('legend span.fieldset-legend:not(.visually-hidden)').removeClass('js-form-required form-required');
        }
      }

      // Fix #required for radios.
      // @see Issue #2856795: If radio buttons are required but not filled form is nevertheless submitted.
      if ($target.is('.js-webform-type-radios, .js-form-type-webform-radios-other')) {
        if (e.value) {
          $target.find('input[type="radio"]').attr({'required': 'required', 'aria-required': 'true'});
        }
        else {
          $target.find('input[type="radio"]').removeAttr('required aria-required');
        }
      }

      // Fix #required for checkboxes.
      // @see Issue #2938414: Checkboxes don't support #states required.
      // @see checkboxRequiredhandler
      if ($target.is('.js-webform-type-checkboxes, .js-form-type-webform-checkboxes-other')) {
        var $checkboxes = $target.find('input[type="checkbox"]');
        if (e.value) {
          // Bind the event handler and add custom HTML5 required validation
          // to all checkboxes.
          $checkboxes.bind('click', checkboxRequiredhandler);
          if (!$checkboxes.is(':checked')) {
            $checkboxes.attr({'required': 'required', 'aria-required': 'true'});
          }
        }
        else {
          // Remove custom HTML5 required validation from all checkboxes
          // and unbind the event handler.
          $checkboxes
            .removeAttr('required aria-required')
            .unbind('click', checkboxRequiredhandler);
        }
      }

      // Issue #2986017: Fieldsets shouldn't have required attribute.
      if ($target.is('fieldset')) {
        $target.removeAttr('required aria-required');
      }
    }

  });

  $document.on('state:readonly', function (e) {
    if (e.trigger && $(e.target).isWebform()) {
      $(e.target).prop('readonly', e.value).closest('.js-form-item, .js-form-wrapper').toggleClass('webform-readonly', e.value).find('input, textarea').prop('readonly', e.value);
    }
  });

  $document.on('state:visible state:visible-slide', function (e) {
    if (e.trigger && $(e.target).isWebform()) {
      if (e.value) {
        $(':input', e.target).addBack().each(function () {
          restoreValueAndRequired(this);
          triggerEventHandlers(this);
        });
      }
      else {
        // @see https://www.sitepoint.com/jquery-function-clear-form-data/
        $(':input', e.target).addBack().each(function () {
          backupValueAndRequired(this);
          clearValueAndRequired(this);
          triggerEventHandlers(this);
        });
      }
    }
  });

  $document.bind('state:visible-slide', function (e) {
    if (e.trigger && $(e.target).isWebform()) {
      var effect = e.value ? 'slideDown' : 'slideUp';
      var duration = Drupal.webform.states[effect].duration;
      $(e.target).closest('.js-form-item, .js-form-submit, .js-form-wrapper')[effect](duration);
    }
  });
  Drupal.states.State.aliases['invisible-slide'] = '!visible-slide';

  $document.on('state:disabled', function (e) {
    if (e.trigger && $(e.target).isWebform()) {
      // Make sure disabled property is set before triggering webform:disabled.
      // Copied from: core/misc/states.js
      $(e.target)
        .prop('disabled', e.value)
        .closest('.js-form-item, .js-form-submit, .js-form-wrapper').toggleClass('form-disabled', e.value)
        .find('select, input, textarea, button').prop('disabled', e.value);

      // Trigger webform:disabled.
      $(e.target).trigger('webform:disabled')
        .find('select, input, textarea, button').trigger('webform:disabled');
    }
  });

  /**
   * Trigger custom HTML5 multiple checkboxes validation.
   *
   * @see https://stackoverflow.com/a/37825072/145846
   */
  function checkboxRequiredhandler() {
    var $checkboxes = $(this).closest('.js-webform-type-checkboxes, .js-form-type-webform-checkboxes-other').find('input[type="checkbox"]');
    if ($checkboxes.is(':checked')) {
      $checkboxes.removeAttr('required aria-required');
    }
    else {
      $checkboxes.attr({'required': 'required', 'aria-required': 'true'});
    }
  }

  /**
   * Trigger an input's event handlers.
   *
   * @param {element} input
   *   An input.
   */
  function triggerEventHandlers(input) {
    var $input = $(input);
    var type = input.type;
    var tag = input.tagName.toLowerCase();
    // Add 'webform.states' as extra parameter to event handlers.
    // @see Drupal.behaviors.webformUnsaved
    var extraParameters = ['webform.states'];
    if (type === 'checkbox' || type === 'radio') {
      $input
        .trigger('change', extraParameters)
        .trigger('blur', extraParameters);
    }
    else if (tag === 'select') {
      $input
        .trigger('change', extraParameters)
        .trigger('blur', extraParameters);
    }
    else if (type !== 'submit' && type !== 'button' && type !== 'file') {
      $input
        .trigger('input', extraParameters)
        .trigger('change', extraParameters)
        .trigger('keydown', extraParameters)
        .trigger('keyup', extraParameters)
        .trigger('blur', extraParameters);
    }
  }

  /**
   * Backup an input's current value and required attribute
   *
   * @param {element} input
   *   An input.
   */
  function backupValueAndRequired(input) {
    var $input = $(input);
    var type = input.type;
    var tag = input.tagName.toLowerCase(); // Normalize case.

    // Backup required.
    if ($input.prop('required') && !$input.hasData('webform-required')) {
      $input.data('webform-required', true);
    }

    // Backup value.
    if (!$input.hasData('webform-value')) {
      if (type === 'checkbox' || type === 'radio') {
        $input.data('webform-value', $input.prop('checked'));
      }
      else if (tag === 'select') {
        var values = [];
        $input.find('option:selected').each(function (i, option) {
          values[i] = option.value;
        });
        $input.data('webform-value', values);
      }
      else if (type !== 'submit' && type !== 'button') {
        $input.data('webform-value', input.value);
      }
    }
  }

  /**
   * Restore an input's value and required attribute.
   *
   * @param {element} input
   *   An input.
   */
  function restoreValueAndRequired(input) {
    var $input = $(input);

    // Restore value.
    var value = $input.data('webform-value');
    if (typeof value !== 'undefined') {
      var type = input.type;
      var tag = input.tagName.toLowerCase(); // Normalize case.

      if (type === 'checkbox' || type === 'radio') {
        $input.prop('checked', value);
      }
      else if (tag === 'select') {
        $.each(value, function (i, option_value) {
          $input.find("option[value='" + option_value + "']").prop('selected', true);
        });
      }
      else if (type !== 'submit' && type !== 'button') {
        input.value = value;
      }
      $input.removeData('webform-value');
    }

    // Restore required.
    var required = $input.data('webform-required');
    if (typeof required !== 'undefined') {
      if (required) {
        $input.prop('required', true);
      }
      $input.removeData('webform-required');
    }
  }

  /**
   * Clear an input's value and required attributes.
   *
   * @param {element} input
   *   An input.
   */
  function clearValueAndRequired(input) {
    var $input = $(input);

    // Check for #states no clear attribute.
    // @see https://css-tricks.com/snippets/jquery/make-an-jquery-hasattr/
    if ($input.closest('[data-webform-states-no-clear]').length) {
      return;
    }

    // Clear value.
    var type = input.type;
    var tag = input.tagName.toLowerCase(); // Normalize case.
    if (type === 'checkbox' || type === 'radio') {
      $input.prop('checked', false);
    }
    else if (tag === 'select') {
      if ($input.find('option[value=""]').length) {
        $input.val('');
      }
      else {
        input.selectedIndex = -1;
      }
    }
    else if (type !== 'submit' && type !== 'button') {
      input.value = (type === 'color') ? '#000000' : '';
    }

    // Clear required.
    $input.prop('required', false);
  }

})(jQuery, Drupal);
;
/**
 * @file
 * JavaScript behaviors for custom webform #states.
 */

(function ($, Drupal) {

  'use strict';

  $(document).on('state:required', function (e) {
    if (e.trigger && $(e.target).isWebform()) {
      var $target = $(e.target);

      // @see Issue #2856315: Conditional Logic - Requiring Radios in a Fieldset.
      // Fix #required for fieldsets.
      if ($target.is('.js-form-wrapper.panel')) {
        if (e.value) {
          $target.find('.panel-heading .panel-title').addClass('js-form-required form-required');
        }
        else {
          $target.find('.panel-heading .panel-title').removeClass('js-form-required form-required');
        }
      }

    }
  });

})(jQuery, Drupal);
;
/**
 * @file
 * Bootstrap Popovers.
 */

var Drupal = Drupal || {};

(function ($, Drupal, Bootstrap) {
  "use strict";

  var $document = $(document);

  /**
   * Extend the Bootstrap Popover plugin constructor class.
   */
  Bootstrap.extendPlugin('popover', function (settings) {
    return {
      DEFAULTS: {
        animation: !!settings.popover_animation,
        autoClose: !!settings.popover_auto_close,
        enabled: settings.popover_enabled,
        html: !!settings.popover_html,
        placement: settings.popover_placement,
        selector: settings.popover_selector,
        trigger: settings.popover_trigger,
        title: settings.popover_title,
        content: settings.popover_content,
        delay: parseInt(settings.popover_delay, 10),
        container: settings.popover_container
      }
    };
  });

  /**
   * Bootstrap Popovers.
   *
   * @todo This should really be properly delegated if selector option is set.
   */
  Drupal.behaviors.bootstrapPopovers = {
    $activePopover: null,
    attach: function (context) {
      // Immediately return if popovers are not available.
      if (!$.fn.popover || !$.fn.popover.Constructor.DEFAULTS.enabled) {
        return;
      }

      var _this = this;

      $document
        .on('show.bs.popover', '[data-toggle=popover]', function () {
          var $trigger = $(this);
          var popover = $trigger.data('bs.popover');

          // Only keep track of clicked triggers that we're manually handling.
          if (popover.options.originalTrigger === 'click') {
            if (_this.$activePopover && _this.getOption('autoClose') && !_this.$activePopover.is($trigger)) {
              _this.$activePopover.popover('hide');
            }
            _this.$activePopover = $trigger;
          }
        })
        // Unfortunately, :focusable is only made available when using jQuery
        // UI. While this would be the most semantic pseudo selector to use
        // here, jQuery UI may not always be loaded. Instead, just use :visible
        // here as this just needs some sort of selector here. This activates
        // delegate binding to elements in jQuery so it can work it's bubbling
        // focus magic since elements don't really propagate their focus events.
        // @see https://www.drupal.org/project/bootstrap/issues/3013236
        .on('focus.bs.popover', ':visible', function (e) {
          var $target = $(e.target);
          if (_this.$activePopover && _this.getOption('autoClose') && !_this.$activePopover.is($target) && !$target.closest('.popover.in')[0]) {
            _this.$activePopover.popover('hide');
            _this.$activePopover = null;
          }
        })
        .on('click.bs.popover', function (e) {
          var $target = $(e.target);
          if (_this.$activePopover && _this.getOption('autoClose') && !$target.is('[data-toggle=popover]') && !$target.closest('.popover.in')[0]) {
            _this.$activePopover.popover('hide');
            _this.$activePopover = null;
          }
        })
        .on('keyup.bs.popover', function (e) {
          if (_this.$activePopover && _this.getOption('autoClose') && e.which === 27) {
            _this.$activePopover.popover('hide');
            _this.$activePopover = null;
          }
        })
      ;

      var elements = $(context).find('[data-toggle=popover]').toArray();
      for (var i = 0; i < elements.length; i++) {
        var $element = $(elements[i]);
        var options = $.extend({}, $.fn.popover.Constructor.DEFAULTS, $element.data());

        // Store the original trigger.
        options.originalTrigger = options.trigger;

        // If the trigger is "click", then we'll handle it manually here.
        if (options.trigger === 'click') {
          options.trigger = 'manual';
        }

        // Retrieve content from a target element.
        var target = options.target || $element.is('a[href^="#"]') && $element.attr('href');
        var $target = $document.find(target).clone();
        if (!options.content && $target[0]) {
          $target.removeClass('visually-hidden hidden').removeAttr('aria-hidden');
          options.content = $target.wrap('<div/>').parent()[options.html ? 'html' : 'text']() || '';
        }

        // Initialize the popover.
        $element.popover(options);

        // Handle clicks manually.
        if (options.originalTrigger === 'click') {
          // To ensure the element is bound multiple times, remove any
          // previously set event handler before adding another one.
          $element
            .off('click.drupal.bootstrap.popover')
            .on('click.drupal.bootstrap.popover', function (e) {
              $(this).popover('toggle');
              e.preventDefault();
              e.stopPropagation();
            })
          ;
        }
      }
    },
    detach: function (context) {
      // Immediately return if popovers are not available.
      if (!$.fn.popover || !$.fn.popover.Constructor.DEFAULTS.enabled) {
        return;
      }

      // Destroy all popovers.
      $(context).find('[data-toggle="popover"]')
        .off('click.drupal.bootstrap.popover')
        .popover('destroy')
      ;
    },
    getOption: function(name, defaultValue, element) {
      var $element = element ? $(element) : this.$activePopover;
      var options = $.extend(true, {}, $.fn.popover.Constructor.DEFAULTS, ($element && $element.data('bs.popover') || {}).options);
      if (options[name] !== void 0) {
        return options[name];
      }
      return defaultValue !== void 0 ? defaultValue : void 0;
    }
  };

})(window.jQuery, window.Drupal, window.Drupal.bootstrap);
;
/**
 * @file
 * Bootstrap Tooltips.
 */

var Drupal = Drupal || {};

(function ($, Drupal, Bootstrap) {
  "use strict";

  /**
   * Extend the Bootstrap Tooltip plugin constructor class.
   */
  Bootstrap.extendPlugin('tooltip', function (settings) {
    return {
      DEFAULTS: {
        animation: !!settings.tooltip_animation,
        html: !!settings.tooltip_html,
        placement: settings.tooltip_placement,
        selector: settings.tooltip_selector,
        trigger: settings.tooltip_trigger,
        delay: parseInt(settings.tooltip_delay, 10),
        container: settings.tooltip_container
      }
    };
  });

  /**
   * Bootstrap Tooltips.
   *
   * @todo This should really be properly delegated if selector option is set.
   */
  Drupal.behaviors.bootstrapTooltips = {
    attach: function (context) {
      var elements = $(context).find('[data-toggle="tooltip"]').toArray();
      for (var i = 0; i < elements.length; i++) {
        var $element = $(elements[i]);
        var options = $.extend({}, $.fn.tooltip.Constructor.DEFAULTS, $element.data());
        $element.tooltip(options);
      }
    },
    detach: function (context) {
      // Destroy all tooltips.
      $(context).find('[data-toggle="tooltip"]').tooltip('destroy');
    }
  };

})(window.jQuery, window.Drupal, window.Drupal.bootstrap);
;
/**
* DO NOT EDIT THIS FILE.
* See the following change record for more information,
* https://www.drupal.org/node/2815083
* @preserve
**/

Drupal.debounce = function (func, wait, immediate) {
  var timeout = void 0;
  var result = void 0;
  return function () {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    var context = this;
    var later = function later() {
      timeout = null;
      if (!immediate) {
        result = func.apply(context, args);
      }
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) {
      result = func.apply(context, args);
    }
    return result;
  };
};;
/*! jquery.cookie v1.4.1 | MIT */
!function(a){"function"==typeof define&&define.amd?define(["jquery"],a):"object"==typeof exports?a(require("jquery")):a(jQuery)}(function(a){function b(a){return h.raw?a:encodeURIComponent(a)}function c(a){return h.raw?a:decodeURIComponent(a)}function d(a){return b(h.json?JSON.stringify(a):String(a))}function e(a){0===a.indexOf('"')&&(a=a.slice(1,-1).replace(/\\"/g,'"').replace(/\\\\/g,"\\"));try{return a=decodeURIComponent(a.replace(g," ")),h.json?JSON.parse(a):a}catch(b){}}function f(b,c){var d=h.raw?b:e(b);return a.isFunction(c)?c(d):d}var g=/\+/g,h=a.cookie=function(e,g,i){if(void 0!==g&&!a.isFunction(g)){if(i=a.extend({},h.defaults,i),"number"==typeof i.expires){var j=i.expires,k=i.expires=new Date;k.setTime(+k+864e5*j)}return document.cookie=[b(e),"=",d(g),i.expires?"; expires="+i.expires.toUTCString():"",i.path?"; path="+i.path:"",i.domain?"; domain="+i.domain:"",i.secure?"; secure":""].join("")}for(var l=e?void 0:{},m=document.cookie?document.cookie.split("; "):[],n=0,o=m.length;o>n;n++){var p=m[n].split("="),q=c(p.shift()),r=p.join("=");if(e&&e===q){l=f(r,g);break}e||void 0===(r=f(r))||(l[q]=r)}return l};h.defaults={},a.removeCookie=function(b,c){return void 0===a.cookie(b)?!1:(a.cookie(b,"",a.extend({},c,{expires:-1})),!a.cookie(b))}});;
/**
* DO NOT EDIT THIS FILE.
* See the following change record for more information,
* https://www.drupal.org/node/2815083
* @preserve
**/

(function ($, Drupal, debounce) {
  $.fn.drupalGetSummary = function () {
    var callback = this.data('summaryCallback');
    return this[0] && callback ? $.trim(callback(this[0])) : '';
  };

  $.fn.drupalSetSummary = function (callback) {
    var self = this;

    if (typeof callback !== 'function') {
      var val = callback;
      callback = function callback() {
        return val;
      };
    }

    return this.data('summaryCallback', callback).off('formUpdated.summary').on('formUpdated.summary', function () {
      self.trigger('summaryUpdated');
    }).trigger('summaryUpdated');
  };

  Drupal.behaviors.formSingleSubmit = {
    attach: function attach() {
      function onFormSubmit(e) {
        var $form = $(e.currentTarget);
        var formValues = $form.serialize();
        var previousValues = $form.attr('data-drupal-form-submit-last');
        if (previousValues === formValues) {
          e.preventDefault();
        } else {
          $form.attr('data-drupal-form-submit-last', formValues);
        }
      }

      $('body').once('form-single-submit').on('submit.singleSubmit', 'form:not([method~="GET"])', onFormSubmit);
    }
  };

  function triggerFormUpdated(element) {
    $(element).trigger('formUpdated');
  }

  function fieldsList(form) {
    var $fieldList = $(form).find('[name]').map(function (index, element) {
      return element.getAttribute('id');
    });

    return $.makeArray($fieldList);
  }

  Drupal.behaviors.formUpdated = {
    attach: function attach(context) {
      var $context = $(context);
      var contextIsForm = $context.is('form');
      var $forms = (contextIsForm ? $context : $context.find('form')).once('form-updated');
      var formFields = void 0;

      if ($forms.length) {
        $.makeArray($forms).forEach(function (form) {
          var events = 'change.formUpdated input.formUpdated ';
          var eventHandler = debounce(function (event) {
            triggerFormUpdated(event.target);
          }, 300);
          formFields = fieldsList(form).join(',');

          form.setAttribute('data-drupal-form-fields', formFields);
          $(form).on(events, eventHandler);
        });
      }

      if (contextIsForm) {
        formFields = fieldsList(context).join(',');

        var currentFields = $(context).attr('data-drupal-form-fields');

        if (formFields !== currentFields) {
          triggerFormUpdated(context);
        }
      }
    },
    detach: function detach(context, settings, trigger) {
      var $context = $(context);
      var contextIsForm = $context.is('form');
      if (trigger === 'unload') {
        var $forms = (contextIsForm ? $context : $context.find('form')).removeOnce('form-updated');
        if ($forms.length) {
          $.makeArray($forms).forEach(function (form) {
            form.removeAttribute('data-drupal-form-fields');
            $(form).off('.formUpdated');
          });
        }
      }
    }
  };

  Drupal.behaviors.fillUserInfoFromBrowser = {
    attach: function attach(context, settings) {
      var userInfo = ['name', 'mail', 'homepage'];
      var $forms = $('[data-user-info-from-browser]').once('user-info-from-browser');
      if ($forms.length) {
        userInfo.forEach(function (info) {
          var $element = $forms.find('[name=' + info + ']');
          var browserData = localStorage.getItem('Drupal.visitor.' + info);
          var emptyOrDefault = $element.val() === '' || $element.attr('data-drupal-default-value') === $element.val();
          if ($element.length && emptyOrDefault && browserData) {
            $element.val(browserData);
          }
        });
      }
      $forms.on('submit', function () {
        userInfo.forEach(function (info) {
          var $element = $forms.find('[name=' + info + ']');
          if ($element.length) {
            localStorage.setItem('Drupal.visitor.' + info, $element.val());
          }
        });
      });
    }
  };

  var handleFragmentLinkClickOrHashChange = function handleFragmentLinkClickOrHashChange(e) {
    var url = void 0;
    if (e.type === 'click') {
      url = e.currentTarget.location ? e.currentTarget.location : e.currentTarget;
    } else {
      url = window.location;
    }
    var hash = url.hash.substr(1);
    if (hash) {
      var $target = $('#' + hash);
      $('body').trigger('formFragmentLinkClickOrHashChange', [$target]);

      setTimeout(function () {
        return $target.trigger('focus');
      }, 300);
    }
  };

  var debouncedHandleFragmentLinkClickOrHashChange = debounce(handleFragmentLinkClickOrHashChange, 300, true);

  $(window).on('hashchange.form-fragment', debouncedHandleFragmentLinkClickOrHashChange);

  $(document).on('click.form-fragment', 'a[href*="#"]', debouncedHandleFragmentLinkClickOrHashChange);
})(jQuery, Drupal, Drupal.debounce);;
/**
 * @file
 * Extends methods from core/misc/form.js.
 */

(function ($, window, Drupal, drupalSettings) {

  /**
   * Behavior for "forms_has_error_value_toggle" theme setting.
   */
  Drupal.behaviors.bootstrapForm = {
    attach: function (context) {
      if (drupalSettings.bootstrap && drupalSettings.bootstrap.forms_has_error_value_toggle) {
        var $context = $(context);
        $context.find('.form-item.has-error:not(.form-type-password.has-feedback)').once('error').each(function () {
          var $formItem = $(this);
          var $input = $formItem.find(':input');
          $input.on('keyup focus blur', function () {
            if (this.defaultValue !== void 0) {
              $formItem[this.defaultValue !== this.value ? 'removeClass' : 'addClass']('has-error');
              $input[this.defaultValue !== this.value ? 'removeClass' : 'addClass']('error');
            }
          });
        });
      }
    }
  };


})(jQuery, this, Drupal, drupalSettings);
;
/**
 * @file
 * JavaScript behaviors for webforms.
 */

(function ($, Drupal) {

  'use strict';

  /**
   * Remove single submit event listener.
   *
   * @type {Drupal~behavior}
   *
   * @prop {Drupal~behaviorAttach} attach
   *   Attaches the behavior for removing single submit event listener.
   *
   * @see Drupal.behaviors.formSingleSubmit
   */
  Drupal.behaviors.weformRemoveFormSingleSubmit = {
    attach: function attach() {
      function onFormSubmit(e) {
        var $form = $(e.currentTarget);
        $form.removeAttr('data-drupal-form-submit-last');
      }
      $('body')
        .once('webform-single-submit')
        .on('submit.singleSubmit', 'form.webform-remove-single-submit:not([method~="GET"])', onFormSubmit);
    }
  };

  /**
   * Autofocus first input.
   *
   * @type {Drupal~behavior}
   *
   * @prop {Drupal~behaviorAttach} attach
   *   Attaches the behavior for the webform autofocusing.
   */
  Drupal.behaviors.webformAutofocus = {
    attach: function (context) {
      $(context).find('.webform-submission-form.js-webform-autofocus :input:visible:enabled:first').focus();
    }
  };

  /**
   * Prevent webform autosubmit on wizard pages.
   *
   * @type {Drupal~behavior}
   *
   * @prop {Drupal~behaviorAttach} attach
   *   Attaches the behavior for disabling webform autosubmit.
   *   Wizard pages need to be progressed with the Previous or Next buttons, not by pressing Enter.
   */
  Drupal.behaviors.webformDisableAutoSubmit = {
    attach: function (context) {
      // @see http://stackoverflow.com/questions/11235622/jquery-disable-form-submit-on-enter
      $(context).find('.webform-submission-form.js-webform-disable-autosubmit input')
        .not(':button, :submit, :reset, :image, :file')
        .once('webform-disable-autosubmit')
        .on('keyup keypress', function (e) {
          var keyCode = e.keyCode || e.which;
          if (keyCode === 13) {
            e.preventDefault();
            return false;
          }
        });
    }
  };

  /**
   * Skip client-side validation when submit button is pressed.
   *
   * @type {Drupal~behavior}
   *
   * @prop {Drupal~behaviorAttach} attach
   *   Attaches the behavior for the skipping client-side validation.
   */
  Drupal.behaviors.webformSubmitNoValidate = {
    attach: function (context) {
      $(context).find(':submit.js-webform-novalidate').once('webform-novalidate').on('click', function () {
        $(this.form).attr('novalidate', 'novalidate');
      });
    }
  };

  /**
   * Attach behaviors to trigger submit button from input onchange.
   *
   * @type {Drupal~behavior}
   *
   * @prop {Drupal~behaviorAttach} attach
   *   Attaches form trigger submit events.
   */
  Drupal.behaviors.webformSubmitTrigger = {
    attach: function (context) {
      $('[data-webform-trigger-submit]').once('webform-trigger-submit').on('change', function () {
        var submit = $(this).attr('data-webform-trigger-submit');
        $(submit).mousedown();
      });
    }
  };

  /**
   * Custom required error message.
   *
   * @type {Drupal~behavior}
   *
   * @prop {Drupal~behaviorAttach} attach
   *   Attaches the behavior for the webform custom required error message.
   *
   * @see http://stackoverflow.com/questions/5272433/html5-form-required-attribute-set-custom-validation-message
   */
  Drupal.behaviors.webformRequiredError = {
    attach: function (context) {
      $(context).find(':input[data-webform-required-error]').once('webform-required-error')
        .on('invalid', function () {
          this.setCustomValidity('');
          if (!this.valid) {
            this.setCustomValidity($(this).attr('data-webform-required-error'));
          }
        })
        .on('input, change', function () {
          // Find all related elements by name and reset custom validity.
          // This specifically applies to required radios and checkboxes.
          var name = $(this).attr('name');
          $(this.form).find(':input[name="' + name + '"]').each(function () {
            this.setCustomValidity('');
          });
        });
    }
  };

  // When #state:required is triggered we need to reset the target elements
  // custom validity.
  $(document).on('state:required', function (e) {
    $(e.target).filter('[data-webform-required-error]')
      .each(function () {this.setCustomValidity('');});
  });

  if (window.imceInput) {
    window.imceInput.processUrlInput = function (i, el) {
      var button = imceInput.createUrlButton(el.id, el.getAttribute('data-imce-type'));
      el.parentNode.insertAfter(button, el);
    };
  }

})(jQuery, Drupal);
;
/**
* DO NOT EDIT THIS FILE.
* See the following change record for more information,
* https://www.drupal.org/node/2815083
* @preserve
**/

(function (Drupal, debounce) {
  var liveElement = void 0;
  var announcements = [];

  Drupal.behaviors.drupalAnnounce = {
    attach: function attach(context) {
      if (!liveElement) {
        liveElement = document.createElement('div');
        liveElement.id = 'drupal-live-announce';
        liveElement.className = 'visually-hidden';
        liveElement.setAttribute('aria-live', 'polite');
        liveElement.setAttribute('aria-busy', 'false');
        document.body.appendChild(liveElement);
      }
    }
  };

  function announce() {
    var text = [];
    var priority = 'polite';
    var announcement = void 0;

    var il = announcements.length;
    for (var i = 0; i < il; i++) {
      announcement = announcements.pop();
      text.unshift(announcement.text);

      if (announcement.priority === 'assertive') {
        priority = 'assertive';
      }
    }

    if (text.length) {
      liveElement.innerHTML = '';

      liveElement.setAttribute('aria-busy', 'true');

      liveElement.setAttribute('aria-live', priority);

      liveElement.innerHTML = text.join('\n');

      liveElement.setAttribute('aria-busy', 'false');
    }
  }

  Drupal.announce = function (text, priority) {
    announcements.push({
      text: text,
      priority: priority
    });

    return debounce(announce, 200)();
  };
})(Drupal, Drupal.debounce);;
/**
 * @file
 * JavaScript behaviors for details element.
 */

(function ($, Drupal) {

  'use strict';

  Drupal.webform = Drupal.webform || {};
  Drupal.webform.detailsToggle = Drupal.webform.detailsToggle || {};
  Drupal.webform.detailsToggle.options = Drupal.webform.detailsToggle.options || {};

  /**
   * Attach handler to toggle details open/close state.
   *
   * @type {Drupal~behavior}
   */
  Drupal.behaviors.webformDetailsToggle = {
    attach: function (context) {
      $('.js-webform-details-toggle', context).once('webform-details-toggle').each(function () {
        var $form = $(this);
        var $tabs = $form.find('.webform-tabs');

        // Get only the main details elements and ignore all nested details.
        var selector = ($tabs.length) ? '.webform-tab' : '.js-webform-details-toggle';
        var $details = $form.find('details').filter(function () {
          // @todo Figure out how to optimize the below code.
          var $parents = $(this).parentsUntil(selector);
          return ($parents.find('details').length === 0);
        });

        // Toggle is only useful when there are two or more details elements.
        if ($details.length < 2) {
          return;
        }

        var options = $.extend({
          button: '<button type="button" class="webform-details-toggle-state"></button>'
        }, Drupal.webform.detailsToggle.options);

        // Create toggle buttons.
        var $toggle = $(options.button)
          .attr('title', Drupal.t('Toggle details widget state.'))
          .on('click', function (e) {
            var open;
            if (isFormDetailsOpen($form)) {
              $form.find('details').removeAttr('open');
              open = 0;
            }
            else {
              $form.find('details').attr('open', 'open');
              open = 1;
            }
            setDetailsToggleLabel($form);

            // Set the saved states for all the details elements.
            // @see webform.element.details.save.js
            if (Drupal.webformDetailsSaveGetName) {
              $form.find('details').each(function () {
                var name = Drupal.webformDetailsSaveGetName($(this));
                if (name) {
                  localStorage.setItem(name, open);
                }
              });
            }
          })
          .wrap('<div class="webform-details-toggle-state-wrapper"></div>')
          .parent();

        if ($tabs.length) {
          // Add toggle state before the tabs.
          $tabs.find('.item-list:first-child').eq(0).before($toggle);
        }
        else {
          // Add toggle state link to first details element.
          $details.eq(0).before($toggle);
        }

        setDetailsToggleLabel($form);
      });
    }
  };

  /**
   * Determine if a webform's details are all opened.
   *
   * @param {jQuery} $form
   *   A webform.
   *
   * @return {boolean}
   *   TRUE if a webform's details are all opened.
   */
  function isFormDetailsOpen($form) {
    return ($form.find('details[open]').length === $form.find('details').length);
  }

  /**
   * Set a webform's details toggle state widget label.
   *
   * @param {jQuery} $form
   *   A webform.
   */
  function setDetailsToggleLabel($form) {
    var isOpen = isFormDetailsOpen($form);

    var label = (isOpen) ? Drupal.t('Collapse all') : Drupal.t('Expand all');
    $form.find('.webform-details-toggle-state').html(label);

    var text = (isOpen) ? Drupal.t('All details have been expanded.') : Drupal.t('All details have been collapsed.');
    Drupal.announce(text);
  }

})(jQuery, Drupal);
;
/**
 * @file
 * JavaScript behaviors for details element.
 */

(function ($, Drupal) {

  'use strict';

  /**
   * Attach handler to save details open/close state.
   *
   * @type {Drupal~behavior}
   */
  Drupal.behaviors.webformDetailsSave = {
    attach: function (context) {
      if (!window.localStorage) {
        return;
      }

      // Summary click event handler.
      $('details > summary', context).once('webform-details-summary-save').click(function () {
        var $details = $(this).parent();


        // @see https://css-tricks.com/snippets/jquery/make-an-jquery-hasattr/
        if ($details[0].hasAttribute('data-webform-details-nosave')) {
          return;
        }

        var name = Drupal.webformDetailsSaveGetName($details);
        if (!name) {
          return;
        }

        var open = ($details.attr('open') !== 'open') ? '1' : '0';
        localStorage.setItem(name, open);
      });

      // Initialize details open state via local storage.
      $('details', context).once('webform-details-save').each(function () {
        var $details = $(this);

        var name = Drupal.webformDetailsSaveGetName($details);
        if (!name) {
          return;
        }

        var open = localStorage.getItem(name);
        if (open === null) {
          return;
        }

        if (open === '1') {
          $details.attr('open', 'open');
        }
        else {
          $details.removeAttr('open');
        }
      });
    }

  };

  /**
   * Get the name used to store the state of details element.
   *
   * @param {jQuery} $details
   *   A details element.
   *
   * @return {string}
   *   The name used to store the state of details element.
   */
  Drupal.webformDetailsSaveGetName = function ($details) {
    if (!window.localStorage) {
      return '';
    }

    // Any details element not included a webform must have define its own id.
    var webformId = $details.attr('data-webform-element-id');
    if (webformId) {
      return 'Drupal.webform.' + webformId.replace('--', '.');
    }

    var detailsId = $details.attr('id');
    if (!detailsId) {
      return '';
    }

    var $form = $details.parents('form');
    if (!$form.length || !$form.attr('id')) {
      return '';
    }

    var formId = $form.attr('id');
    if (!formId) {
      return '';
    }

    // ISSUE: When Drupal renders a webform in a modal dialog it appends a unique
    // identifier to webform ids and details ids. (i.e. my-form--FeSFISegTUI)
    // WORKAROUND: Remove the unique id that delimited using double dashes.
    formId = formId.replace(/--.+?$/, '').replace(/-/g, '_');
    detailsId = detailsId.replace(/--.+?$/, '').replace(/-/g, '_');
    return 'Drupal.webform.' + formId + '.' + detailsId;
  };

})(jQuery, Drupal);
;
/**
 * @file
 * JavaScript behaviors for message element integration.
 */

(function ($, Drupal) {

  'use strict';

  /**
   * Behavior for handler message close.
   *
   * @type {Drupal~behavior}
   */
  Drupal.behaviors.webformMessageClose = {
    attach: function (context) {
      $(context).find('.js-webform-message--close').once('webform-message--close').each(function () {
        var $element = $(this);

        var id = $element.attr('data-message-id');
        var storage = $element.attr('data-message-storage');
        var effect = $element.attr('data-message-close-effect') || 'hide';
        switch (effect) {
          case 'slide': effect = 'slideUp'; break;

          case 'fade': effect = 'fadeOut'; break;
        }

        // Check storage status.
        if (isClosed($element, storage, id)) {
          return;
        }

        // Only show element if it's style is not set to 'display: none'.
        if ($element.attr('style') !== 'display: none;') {
          $element.show();
        }

        $element.find('.js-webform-message__link').on('click', function (event) {
          $element[effect]();
          setClosed($element, storage, id);
          $element.trigger('close');
          event.preventDefault();
        });
      });
    }
  };

  function isClosed($element, storage, id) {
    if (!id || !storage) {
      return false;
    }

    switch (storage) {
      case 'local':
        if (window.localStorage) {
          return localStorage.getItem('Drupal.webform.message.' + id) || false;
        }
        return false;

      case 'session':
        if (window.sessionStorage) {
          return sessionStorage.getItem('Drupal.webform.message.' + id) || false;
        }
        return false;

      default:
        return false;
    }
  }

  function setClosed($element, storage, id) {
    if (!id || !storage) {
      return;
    }

    switch (storage) {
      case 'local':
        if (window.localStorage) {
          localStorage.setItem('Drupal.webform.message.' + id, true);
        }
        break;

      case 'session':
        if (window.sessionStorage) {
          sessionStorage.setItem('Drupal.webform.message.' + id, true);
        }
        break;

      case 'user':
      case 'state':
      case 'custom':
        $.get($element.find('.js-webform-message__link').attr('href'));
        return true;
    }
  }

})(jQuery, Drupal);
;
/*! glazed_builder 05-02-2019 */
