(function() {	
	
	var Todo = Backbone.Model.extend({
		defaults : {
			job : '',
			completed : false,
			editing : false,
			display : true
		},		
		
		toggle : function(options) {			
			var opt = {'completed' : !this.get('completed')};
			_.extend(opt, options);
			this.save(opt);
		},		
		
		finishEdit : function(job) {
			this.save({'job' : job, 'editing' : false});
		},
		
		tryEdit : function() {
			this.save('editing', true);
		},		
		
		setDisplay : function(display) {
			this.set('display', display);
		}
	});

	var TodoList = Backbone.Collection.extend({

		model : Todo,

		localStorage : new Backbone.LocalStorage('todoPortlet'),

		initialize : function() {
			this.on('add change:completed', function(todo) {
				if (this.filterParam === 'active' && todo.get('completed') || 
						this.filterParam === 'completed' && !todo.get('completed')) {
					todo.setDisplay(false);					
				}
			}, this);
		},
		
		addTodo : function(job) {
			return this.create({'job' : job});
		},
	
		completed : function() {
			return this.filter(function(todo) {
				return todo.get('completed');
			});
		},

		active : function() {
			return this.without.apply(this, this.completed());
		},
		
		filterTodo : function(param) {
			if (param === 'active') {
				_.invoke(this.completed(), 'setDisplay', false);
				_.invoke(this.active(), 'setDisplay', true);
			} else if (param === 'completed') {
				_.invoke(this.active(), 'setDisplay', false);
				_.invoke(this.completed(), 'setDisplay', true);
			} else {
				_.invoke(this.models, 'setDisplay', true);
				param = '';
			}
			this.filterParam = param;
			this.trigger("filter");
		},
		
		clearCompleted : function() {
			_.invoke(this.completed(), 'destroy');
		},
		
		toggleAll : function(completed) {
			_.invoke(this.models, 'toggle', {'completed' : completed});
		}
	});

	var TodoView = Backbone.View.extend({

		tagName : "li",

		template : _.template($('.TodoPortlet > .ItemTmpl').html()),

		events : {
			"click .toggle" : "toggle",
			"dblclick .view" : "edit",
			"click .destroy" : "removeTodo",
			"keypress .Edit" : "finish",
			"blur .Edit" : "cancel"
		},

		initialize : function() {
			this.model.on('change', this.render, this);
			this.model.on('destroy', this.remove, this);
		},

		render : function() {
			this.$el.html(this.template(this.model.toJSON()));
			return this;
		},

		toggle : function() {
			this.model.toggle();
		},

		edit : function() {
			this.model.tryEdit();
			this.$('.Edit').focus();
		},

		cancel : function() {
			this.model.finishEdit(this.model.get('job'));
		},
		
		finish : function(e) {
			if (e.keyCode == 13) {
				var job = this.$('.Edit').val();
				if (!job) {
					this.removeTodo();
				} else {
					this.model.finishEdit(job);
				}				
			} else if (e.keyCode === 27) {
				this.cancel();
			}
		},

		removeTodo : function() {
			this.model.destroy();
		}
	});

	var AppView = Backbone.View.extend({

		statsTemplate : _.template($('.StatsTmpl').html()),

		events : {
			"keypress .NewTodo" : "createTodo",
			"click .ClearCompleted" : "clearCompleted",
			"click .ToggleAll" : "toggleAll"
		},

		initialize : function() {
			this.input = this.$(".NewTodo");
			this.allCheckbox = this.$(".ToggleAll");

			this.model.on('add', this.addOne, this);
			this.model.on('add remove change:completed filter', this.render, this);
			
			_.each(this.model.models, this.addOne, this);
		},

		render : function() {
			var completed = this.model.completed().length;
			var active = this.model.active().length;

			this.$('.Footer').html(this.statsTemplate({
				'active' : active,
				'completed' : completed,
				'filter' : this.model.filterParam
			}));

			this.allCheckbox.attr('checked', active == 0 && this.model.length != 0);
		},

		addOne : function(todo) {
			var view = new TodoView({
				model : todo
			});
			this.$('.TodoList').append(view.render().el);
		},

		createTodo : function(e) {
			if (e.keyCode != 13)
				return;
			if (!this.input.val())
				return;

			this.model.addTodo(this.input.val());
			this.input.val('');
		},

		clearCompleted : function() {
			this.model.clearCompleted();
		},

		toggleAll : function() {
			var completed = this.allCheckbox.attr("checked");
			this.model.toggleAll(completed === "checked");
		}
	});
	
	var todos = new TodoList();		
	todos.fetch();
	var app = new AppView({model : todos, el : $('.TodoPortlet')});

	var TodoRouter = Backbone.Router.extend({
		routes : {
			"*filter" : "filter",
		},
		
		filter : function(param) {
			todos.filterTodo(param);
		}		
	});
	var router = new TodoRouter();
	Backbone.history.start();
})();