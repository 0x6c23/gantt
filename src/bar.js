import date_utils from './date_utils';
import { $, createSVG, animateSVG } from './svg_utils';

export default class Bar {
    constructor(gantt, task) {
        this.set_defaults(gantt, task);
        this.prepare();
        this.draw();
        this.bind();
    }

    set_defaults(gantt, task) {
        this.action_completed = false;
        this.gantt = gantt;
        this.task = task;
    }

    prepare() {
        this.prepare_values();
        this.prepare_helpers();
    }

    prepare_values() {
        this.invalid = this.task.invalid;
        this.height = this.gantt.options.bar_height;
        this.x = this.compute_x();
        this.y = this.compute_y();
        this.corner_radius = this.gantt.options.bar_corner_radius;

        if(this.gantt.view_is('Hour')){

          let hourTaskStartDate = new Date(...date_utils.get_hour_date(this.task._start, this.task.startDayTime));
          let hourTaskEndDate = new Date(...date_utils.get_hour_date(this.task._end, this.task.endDayTime));

          // console.log('HourTaskEndDateHours: ', hourTaskEndDate.getHours());
          // console.log('HourTaskEndDateMinutes: ', hourTaskEndDate.getMinutes());


          if(hourTaskEndDate.getHours() === 0 && hourTaskEndDate.getMinutes() === 0){
            hourTaskEndDate = date_utils.add(hourTaskEndDate, '1', 'day');
          }

          // console.log(`Bar.js Prepare_Values hourTaskStartDate: \n ${hourTaskStartDate} \n hourTaskEndDate: \n ${hourTaskEndDate}  `);

          this.duration =
              (date_utils.diff(hourTaskEndDate, hourTaskStartDate, 'minute') / 60) /
              this.gantt.options.step;

          // console.log('Duration: ', this.duration);
        } else {
          this.duration =
              date_utils.diff(this.task._end, this.task._start, 'hour') /
              this.gantt.options.step;
        }

        this.width = this.gantt.options.column_width * this.duration;


        this.progress_width =
            this.gantt.options.column_width *
                this.duration *
                (this.task.progress / 100) || 0;

        if(this.gantt.view_is('Day')){
          // Add one column width to include the last day it ends on
          this.width          += this.gantt.options.column_width;
          this.progress_width += this.gantt.options.column_width;
        }

        this.group = createSVG('g', {
            class: 'bar-wrapper ' + (this.task.custom_class || ''),
            'data-id': this.task.id
        });
        this.bar_group = createSVG('g', {
            class: 'bar-group',
            append_to: this.group
        });
        this.handle_group = createSVG('g', {
            class: 'handle-group',
            append_to: this.group
        });
    }

    prepare_helpers() {
        SVGElement.prototype.getX = function() {
            return +this.getAttribute('x');
        };
        SVGElement.prototype.getY = function() {
            return +this.getAttribute('y');
        };
        SVGElement.prototype.getWidth = function() {
            return +this.getAttribute('width');
        };
        SVGElement.prototype.getHeight = function() {
            return +this.getAttribute('height');
        };
        SVGElement.prototype.getEndX = function() {
            return this.getX() + this.getWidth();
        };
    }

    draw() {
        this.draw_bar();
        this.draw_progress_bar();
        this.draw_label();
        this.draw_resize_handles();
    }

    draw_bar() {
        this.$bar = createSVG('rect', {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            rx: this.corner_radius,
            ry: this.corner_radius,
            class: 'bar',
            append_to: this.bar_group
        });

        animateSVG(this.$bar, 'width', 0, this.width);

        if (this.invalid) {
            this.$bar.classList.add('bar-invalid');
        }
    }

    draw_progress_bar() {
        if (this.invalid) return;
        this.$bar_progress = createSVG('rect', {
            x: this.x,
            y: this.y,
            width: this.progress_width,
            height: this.height,
            rx: this.corner_radius,
            ry: this.corner_radius,
            class: 'bar-progress',
            append_to: this.bar_group
        });

        animateSVG(this.$bar_progress, 'width', 0, this.progress_width);
    }

    get_label() {
      var label = this.task.name + " ";

      if(this.gantt.view_is('Hour')){
        // label = label + ("0" + this.task._start.getHours()).slice(-2) + ':' + this.task._start.getMinutes() + " - " + ("0" + this.task._end.getHours()).slice(-2) + ":" + this.task._end.getMinutes();
        label = label + this.task.startDayTime + " - " + this.task.endDayTime;

      } else if(this.gantt.view_is('Year')) {

        label = label + `
        ${this.task._start.getDate()}.
        ${this.task._start.getMonth()+1}.
        ${this.task._start.getFullYear()} bis
        ${this.task._end.getDate()}.
        ${this.task._end.getMonth()+1}.
        ${this.task._end.getFullYear()}
        `;

      } else {

        label = label + `
        ${this.task._start.getDate()}.
        ${this.task._start.getMonth()+1} bis
        ${this.task._end.getDate()}.
        ${this.task._end.getMonth()+1}`
      }

      return label;
    }

    draw_label() {
      this.$bar_label = createSVG('text', {
            x: this.x + this.width / 2,
            y: this.y + this.height / 2,
            innerHTML: this.get_label(),
            class: 'bar-label',
            append_to: this.bar_group
        });
        // labels get BBox in the next tick
        requestAnimationFrame(() => this.update_label_position());
    }

    draw_resize_handles() {
        if (this.invalid) return;

        const bar = this.$bar;
        const handle_width = 8;

        createSVG('rect', {
            x: bar.getX() + bar.getWidth() - 9,
            y: bar.getY() + 1,
            width: handle_width,
            height: this.height - 2,
            rx: this.corner_radius,
            ry: this.corner_radius,
            class: 'handle right',
            append_to: this.handle_group
        });

        createSVG('rect', {
            x: bar.getX() + 1,
            y: bar.getY() + 1,
            width: handle_width,
            height: this.height - 2,
            rx: this.corner_radius,
            ry: this.corner_radius,
            class: 'handle left',
            append_to: this.handle_group
        });

        if (this.task.progress && this.task.progress < 100) {
            this.$handle_progress = createSVG('polygon', {
                points: this.get_progress_polygon_points().join(','),
                class: 'handle progress',
                append_to: this.handle_group
            });
        }
    }

    get_progress_polygon_points() {
        const bar_progress = this.$bar_progress;
        return [
            bar_progress.getEndX() - 5,
            bar_progress.getY() + bar_progress.getHeight(),
            bar_progress.getEndX() + 5,
            bar_progress.getY() + bar_progress.getHeight(),
            bar_progress.getEndX(),
            bar_progress.getY() + bar_progress.getHeight() - 8.66
        ];
    }

    bind() {
        if (this.invalid) return;
        this.setup_click_event();
    }

    setup_click_event() {
        $.on(this.group, 'focus ' + this.gantt.options.popup_trigger, e => {
            if (this.action_completed) {
                // just finished a move action, wait for a few seconds
                return;
            }

            if (e.type === 'click') {
                this.gantt.trigger_event('click', [this.task]);
            }

            this.gantt.unselect_all();
            this.group.classList.toggle('active');

            this.show_popup();
        });
    }

    show_popup() {
        if (this.gantt.bar_being_dragged) return;

        if(this.gantt.options.disable_popup) return;

        const start_date = date_utils.format(this.task._start, 'MMM D', this.gantt.options.language);
        const end_date = date_utils.format(
            date_utils.add(this.task._end, -1, 'second'),
            'MMM D',
            this.gantt.options.language
        );
        const subtitle = start_date + ' - ' + end_date;

        this.gantt.show_popup({
            target_element: this.$bar,
            title: this.task.name,
            subtitle: subtitle,
            task: this.task,
        });
    }

    update_bar_position({ x = null, width = null }) {
        const bar = this.$bar;
        if (x) {
            // get all x values of parent task
            const xs = this.task.dependencies.map(dep => {
                return this.gantt.get_bar(dep).$bar.getX();
            });
            // child task must not go before parent
            const valid_x = xs.reduce((prev, curr) => {
                return x >= curr;
            }, x);
            if (!valid_x) {
                width = null;
                return;
            }
            this.update_attr(bar, 'x', x);
        }
        if (width && width >= this.gantt.options.column_width) {
            this.update_attr(bar, 'width', width);
        }
        this.update_label_position();
        this.update_handle_position();
        this.update_progressbar_position();
        this.update_arrow_position();
    }

    date_changed() {
        let changed = false;
        const { new_start_date, new_end_date } = this.compute_start_end_date();

        if(this.gantt.view_is('Hour')){
          this.task.startDayTime = new_start_date;
          this.task.endDayTime = new_end_date;

          this.$bar_label.innerHTML = this.get_label();

          this.gantt.trigger_event('date_change', [
              this.task,
              new_start_date,
              new_end_date
          ]);

          return;
        }

        if (Number(this.task._start) !== Number(new_start_date)) {
            changed = true;
            this.task._start = new_start_date;
        }

        if (Number(this.task._end) !== Number(new_end_date)) {
            changed = true;
            this.task._end = new_end_date;
        }

        if (!changed) return;

        this.$bar_label.innerHTML = this.get_label();

        var secondsToAdd = 0;

        // if(!this.gantt.view_is('Hour')) secondsToAdd = -1;

        this.gantt.trigger_event('date_change', [
            this.task,
            new_start_date,
            date_utils.add(new_end_date, secondsToAdd, 'second')
        ]);
    }

    progress_changed() {
        const new_progress = this.compute_progress();
        this.task.progress = new_progress;
        this.gantt.trigger_event('progress_change', [this.task, new_progress]);
    }

    set_action_completed() {
        this.action_completed = true;
        setTimeout(() => (this.action_completed = false), 1000);
    }


    compute_start_end_date() {
        const bar = this.$bar;
        var x_in_units;

        if(this.gantt.view_is('Day')){
          x_in_units = Math.round(bar.getX() / this.gantt.options.column_width);
        } else {
          x_in_units = bar.getX() / this.gantt.options.column_width;
        }

        let new_start_date;

        if(this.gantt.view_is('Hour')){
          let hourTaskStartDate = new Date(...date_utils.get_hour_date(this.gantt.gantt_start, '00:00'));

          new_start_date = date_utils.add(
              hourTaskStartDate,
              ((x_in_units - 1) * this.gantt.options.step) * 60,
              'minute'
          )

          new_start_date =  ("0" + new_start_date.getHours()).slice(-2) + ':' + ("0" + new_start_date.getMinutes()).slice(-2); //new Date(...newHourlyDate)

        } else {
          new_start_date = date_utils.add(
              this.gantt.gantt_start,
              x_in_units * this.gantt.options.step,
              'hour'
          )

          let newHourlyDate = [
            new_start_date.getFullYear(),
            new_start_date.getMonth(),
            new_start_date.getDate(),
            0,
            0,
            0
          ];

            new_start_date = new Date(...newHourlyDate)
        }


        const width_in_units = bar.getWidth() / this.gantt.options.column_width;

        let new_end_date;

        if(this.gantt.view_is('Hour')){
          let hourTaskStartDate = new Date(...date_utils.get_hour_date(this.gantt.gantt_start, new_start_date));

          new_end_date = date_utils.add(
              hourTaskStartDate,
              (width_in_units * this.gantt.options.step) * 60,
              'minute'
          )

          new_end_date =  ("0" + new_end_date.getHours()).slice(-2) + ':' + ("0" + new_end_date.getMinutes()).slice(-2); //new Date(...newHourlyDate)


        } else if (this.gantt.view_is('Day')) {

          new_end_date = date_utils.add(
              new_start_date,
              (width_in_units * this.gantt.options.step) - 24, // substract 1 day so if the bar ends on the beginning of 15, it will end on (and including) the 14. (23:59)
              'hour'
          );

        } else {
          new_end_date = date_utils.add(
              new_start_date,
              width_in_units * this.gantt.options.step,
              'hour'
          );
        }

        return { new_start_date, new_end_date };
    }

    compute_progress() {
        const progress =
            this.$bar_progress.getWidth() / this.$bar.getWidth() * 100;
        return parseInt(progress, 10);
    }

    compute_x() {
        const { step, column_width } = this.gantt.options;
        const task_start = this.task._start;
        const gantt_start = this.gantt.gantt_start;

        let diff;

        if(this.gantt.view_is('Hour')){
          let hourTaskStartDate = new Date(...date_utils.get_hour_date(task_start, this.task.startDayTime));
          let hourGanttStartDate = new Date(...date_utils.get_hour_date(gantt_start, null));

          console.log(`Bar.js compute_x hourTaskStartDate: \n ${hourTaskStartDate} \n hourGanttStartDate: \n ${ date_utils.add(hourGanttStartDate, '-1', 'day')}  `);

          diff = date_utils.diff(hourTaskStartDate,  date_utils.add(hourGanttStartDate, '-1', 'day'), 'minute') / 60;


          console.log('Diff: ', diff);
        } else {
          console.log('Computing x... Task start: ', this.task._start);
          console.log('Gantt start: ', this.gantt.gantt_start);
          diff = date_utils.diff(task_start, gantt_start, 'hour');
          console.log('Difference in hours: ', diff);
        }


        let x = diff / step * column_width;

        console.log(`X = ${diff} / ${step} * ${column_width} = ${x}`);

        if (this.gantt.view_is('Month')) {
            const diff = date_utils.diff(task_start, gantt_start, 'day');
            x = diff * column_width / 30;
        }
        return x;
    }

    compute_y() {
        return (
            this.gantt.options.header_height +
            this.gantt.options.padding +
            this.task._index * (this.height + this.gantt.options.padding)
        );
    }

    get_snap_position(dx) {
        let odx = dx,
            rem,
            position;

        if (this.gantt.view_is('Week')) {
            rem = dx % (this.gantt.options.column_width / 7);
            position =
                odx -
                rem +
                (rem < this.gantt.options.column_width / 14
                    ? 0
                    : this.gantt.options.column_width / 7);
        } else if (this.gantt.view_is('Month')) {
            rem = dx % (this.gantt.options.column_width / 30);
            position =
                odx -
                rem +
                (rem < this.gantt.options.column_width / 60
                    ? 0
                    : this.gantt.options.column_width / 30);
        } else {
            rem = dx % this.gantt.options.column_width;
            position =
                odx -
                rem +
                (rem < this.gantt.options.column_width / 2
                    ? 0
                    : this.gantt.options.column_width);
        }
        return position;
    }

    update_attr(element, attr, value) {
        value = +value;
        if (!isNaN(value)) {
            element.setAttribute(attr, value);
        }
        return element;
    }

    update_progressbar_position() {
        this.$bar_progress.setAttribute('x', this.$bar.getX());
        this.$bar_progress.setAttribute(
            'width',
            this.$bar.getWidth() * (this.task.progress / 100)
        );
    }

    update_label_position() {
        const bar = this.$bar,
            label = this.group.querySelector('.bar-label');

        if (label.getBBox().width > bar.getWidth()) {
            label.classList.add('big');
            label.setAttribute('x', bar.getX() + bar.getWidth() + 5);
        } else {
            label.classList.remove('big');
            label.setAttribute('x', bar.getX() + bar.getWidth() / 2);
        }
    }

    update_handle_position() {
        const bar = this.$bar;
        this.handle_group
            .querySelector('.handle.left')
            .setAttribute('x', bar.getX() + 1);
        this.handle_group
            .querySelector('.handle.right')
            .setAttribute('x', bar.getEndX() - 9);
        const handle = this.group.querySelector('.handle.progress');
        handle &&
            handle.setAttribute('points', this.get_progress_polygon_points());
    }

    update_arrow_position() {
        this.arrows = this.arrows || [];
        for (let arrow of this.arrows) {
            arrow.update();
        }
    }
}

function isFunction(functionToCheck) {
    var getType = {};
    return (
        functionToCheck &&
        getType.toString.call(functionToCheck) === '[object Function]'
    );
}
