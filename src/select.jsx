'use strict';
var React = require('react');
var assign = require('object-assign');

React.initializeTouchEvents(true);

var keyboard = {
  space: 32,
  enter: 13,
  escape: 27,
  tab: 9,
  upArrow: 38,
  downArrow: 40
};

var doesOptionMatch = function (option, s) {
  s = s.toLowerCase();

  // Check that passed in option wraps a string, if it wraps a component, match val
  if (typeof option.props.children === 'string') {
    return option.props.children.toLowerCase().indexOf(s) === 0;
  } else {
    return option.props.value.tolowerCase().indexOf(s) === 0;
  }
}

var classBase = React.createClass({
  displayName: 'RadonSelect',
  propTypes: {
    children: function (props, propName) {
      if (!props[propName] || !Array.isArray(props[propName])) {
        return new Error('children must be an array of RadonSelect.Option');
      }

      props[propName].forEach(function (child) {
        if (child.type.displayName !== 'RadonSelectOption') {
          return new Error('children must be an array of RadonSelect.Option');
        }
      });
    },
    selectName: React.PropTypes.string.isRequired,
    // TODO
    defaultValue: React.PropTypes.string,
    placeholderText: React.PropTypes.string,
    typeaheadDelay: React.PropTypes.number,
    showCurrentOptionWhenOpen: React.PropTypes.bool,
    onChange: React.PropTypes.func,
    onBlur: React.PropTypes.func,
    // Should there just be a baseClassName that these are derived from?
    className: React.PropTypes.string,
    openClassName: React.PropTypes.string,
    focusClassName: React.PropTypes.string,
    listClassName: React.PropTypes.string,
    currentOptionClassName: React.PropTypes.string,
    hiddenSelectClassName: React.PropTypes.string,
    currentOptionStyle: React.PropTypes.object,
    optionListStyle: React.PropTypes.object
  },
  getDefaultProps () {
    return {
      typeaheadDelay: 1000,
      showCurrentOptionWhenOpen: false,
      onChange: function () {},
      onBlur: function () {},
      className: 'radon-select',
      openClassName: 'open',
      focusClassName: 'focus',
      listClassName: 'radon-select-list',
      currentOptionClassName: 'radon-select-current',
      hiddenSelectClassName: 'radon-select-hidden-select',
      currentOptionStyle: {},
      optionListStyle: {}
    };
  },
  getInitialState () {
    return {
      selectedOptionIndex: false,
      selectedOptionVal: this.props.children[0].props.value,
      open: false,
      focus: false
    };
  },
  getValue () {
    return this.state.selectedOptionVal;
  },
  setValue (val, silent) {
    for (var i = 0; i < this.props.children.length; i++) {
      if (this.props.children[i].props.value === val) {
        this.setState({
          selectedOptionIndex: i,
          selectedOptionVal: val
        }, function () {
          if (!silent) {
            this.props.onChange(this.state.selectedOptionVal);
          }
        });

        break;
      }
    }
  },
  onChange () {
    this.props.onChange(this.state.selectedOptionVal);
  },
  moveIndexByOne (decrement) {
    var selectedOptionIndex = this.state.selectedOptionIndex || 0;
    // Don't go out of array bounds
    if (decrement && this.state.selectedOptionIndex === 0 ||
      !decrement && this.state.selectedOptionIndex === this.props.children.length - 1) {
      return;
    }

    selectedOptionIndex += decrement ? -1 : 1

    this.setState({
      selectedOptionIndex: selectedOptionIndex,
      selectedOptionVal: this.props.children[selectedOptionIndex].props.value
    }, function () {
      this.onChange();

      if (this.state.open) {
        this.isFocusing = true;
        React.findDOMNode(this.refs['option' + this.state.selectedOptionIndex]).focus();
      }
    });
  },
  typeahead (character) {
    var self = this;
    var matchFound = false;
    var currentIndex = 0;

    // If we've got a selectedOptionIndex start at the next one (with wrapping), or start at 0
    if (this.state.selectedOptionIndex !== false &&
      this.state.selectedOptionIndex !== this.props.children.length - 1) {
      currentIndex = this.state.selectedOptionIndex + 1;
    }

    clearTimeout(self.typeaheadCountdown);

    this.typingAhead = true;
    this.currentString = this.currentString ? this.currentString + character : character;

    // Browser will match any other instance starting from the currently selected index and wrapping.
    for (var i = currentIndex; i < this.props.children.length; i++) {
      if (doesOptionMatch(this.props.children[i], this.currentString)) {
        matchFound = i;
        break;
      }
    }

    // If we didn't find a match in the loop from current index to end, check from 0 to current index
    if (!matchFound) {
      for (var j = 0; j <= currentIndex; j++) {
        if (doesOptionMatch(this.props.children[j], this.currentString)) {
          matchFound = j;
          break;
        }
      }
    }

    if (matchFound !== false) {
      this.setState({
        selectedOptionIndex: matchFound,
        selectedOptionVal: this.props.children[matchFound].props.value
      }, function () {
        this.onChange();

        if (this.state.open) {
          this.isFocusing = true;
          React.findDOMNode(this.refs['option' + this.state.selectedOptionIndex]).focus();
        }
      });
    }

    self.typeaheadCountdown = setTimeout(function () {
      self.typeaheadCountdown = undefined;
      self.typingAhead = false;
      self.currentString = '';
    }, this.props.typeaheadDelay)
  },
  toggleOpen () {
    this.isFocusing = false;

    this.setState({
      open: !this.state.open,
      selectedOptionIndex: this.state.selectedOptionIndex || 0
    }, function () {
      this.onChange();

      if (!this.state.open) {
        React.findDOMNode(this.refs['currentOption']).focus(); //eslint-disable-line dot-notation
      } else {
        React.findDOMNode(this.refs['option' + (this.state.selectedOptionIndex || 0)]).focus();
      }
    });
  },
  onFocus () {
    this.setState({
      focus: true
    });
  },
  onBlur () {
    this.setState({
      focus: false
    }, () => { this.props.onBlur(); });
  },
  // Arrow keys are only captured by onKeyDown not onKeyPress
  // http://stackoverflow.com/questions/5597060/detecting-arrow-key-presses-in-javascript
  onKeyDown (ev) {
    var isArrowKey = ev.keyCode === keyboard.upArrow || ev.keyCode === keyboard.downArrow;

    if (this.state.open) {
      ev.preventDefault();

      //charcode is enter, esc, or not typingahead and space
      if (ev.keyCode === keyboard.enter ||
        ev.keyCode === keyboard.escape ||
        !this.typingAhead && ev.keyCode === keyboard.space) {

        this.toggleOpen();
      } else if (isArrowKey) {
        this.moveIndexByOne(/*decrement*/ ev.keyCode === keyboard.upArrow);
        // If not tab, assume alphanumeric
      } else if (ev.keyCode !== keyboard.tab) {
        this.typeahead(String.fromCharCode(ev.keyCode));
      }
    } else {
      if (ev.keyCode === keyboard.space || isArrowKey) {
        ev.preventDefault();
        this.toggleOpen();
      // If not tab, escape, or enter, assume alphanumeric
      } else if (ev.keyCode !== keyboard.enter ||
        ev.keyCode !== keyboard.escape ||
        ev.keyCode !== keyboard.tab) {
        this.typeahead(String.fromCharCode(ev.keyCode));
      }
    }
  },
  onClickOption (index, ev) {
    var child = this.refs['option' + index];

    ev.preventDefault();

    this.setState({
      selectedOptionIndex: index,
      selectedOptionVal: child.props.value,
      open: false
    }, function () {
      this.onChange();

      React.findDOMNode(this.refs['currentOption']).focus(); //eslint-disable-line dot-notation
    });
  },
  onBlurOption (ev) {
    // Sometimes clicks on the scrollbar trigger blur
    // the target is still a select option so do not close the select
    if (React.findDOMNode(this).contains(ev.target)) {
      return;
    }

    // Make sure we only catch blur that wasn't triggered by this component
    if (this.isFocusing) {
      this.isFocusing = false;
    } else {
      this.toggleOpen();
    }
  },
  getWrapperClasses () {
    var wrapperClassNames = [this.props.className];

    if (this.state.open) {
      wrapperClassNames.push(this.props.openClassName);
    }

    if (this.state.focus) {
      wrapperClassNames.push(this.props.focusClassName);
    }

    return wrapperClassNames.join(' ');
  },
  renderChild (child, index) {
    return React.cloneElement(child, {
      key: index,
      ref: 'option' + index,
      isActive: this.state.selectedOptionIndex === index,
      onClick: this.onClickOption.bind(this, index),
      onKeyDown: this.onKeyDown,
      automationId: (this.props.automationId ? this.props.automationId : 'select') + '-option-' + index
    });
  },
  renderSpacerChild (child, index) {
    return React.cloneElement(child, {
      key: index,
      style: {
        visibility: 'hidden',
        height: '0 !important',
        paddingTop: 0,
        paddingBottom: 0
      }
    });
  },
  render () {
    var hiddenListStyle = {visibility: 'hidden'};
    var selectedOptionContent = this.state.selectedOptionIndex !== false &&
      this.props.children[this.state.selectedOptionIndex].props.children;

    if (this.props.optionListStyle) {
      hiddenListStyle = assign({}, this.props.optionListStyle, hiddenListStyle);
    }

    return (
      <div
        className={this.getWrapperClasses()}
        style={this.props.style} >
        {this.props.showCurrentOptionWhenOpen || !this.state.open ?
          <div
            ref='currentOption'
            className={this.props.currentOptionClassName}
            tabIndex={0}
            data-automation-id={this.props.automationId}
            role='button'
            onFocus={this.onFocus}
            onKeyDown={this.onKeyDown}
            onBlur={this.onBlur}
            onClick={this.toggleOpen}
            aria-expanded={this.state.open}
            style={this.props.currentOptionStyle}>
            {selectedOptionContent || this.props.placeholderText || this.props.children[0].props.children}
          </div>
          :
          ''
        }
        {this.state.open ?
          <div className={this.props.listClassName} onBlur={this.onBlurOption} style={this.props.optionListStyle}>
            {React.Children.map(this.props.children, this.renderChild)}
          </div>
          : ''
        }
        <select name={this.props.selectName} value={this.state.selectedOptionVal} className={this.props.hiddenSelectClassName} tabIndex={-1} aria-hidden={true} >
          {React.Children.map(this.props.children, function (child, index) {
            return <option key={index} value={child.props.value}>{child.props.children}</option>
          })}
        </select>
        <span aria-hidden={true} style={hiddenListStyle} tabIndex={-1} >
          <div style={{visibility: 'hidden', height: 0, position: 'relative'}} >
            {React.Children.map(this.props.children, this.renderSpacerChild)}
          </div>
        </span>
      </div>
    );
  }
});

classBase.Option = React.createClass({
  displayName: 'RadonSelectOption',
  propTypes: {
    // TODO: Disabled
    value: React.PropTypes.string.isRequired,
    children: React.PropTypes.string.isRequired,
    onClick: React.PropTypes.func,
    automationId: React.PropTypes.string
  },
  getDefaultProps () {
    return {
      value: '',
      automationId: undefined,
      className: 'radon-select-option',
      activeClassName: 'active',
      hoverClassName: 'hover',
      onClick () {}
    };
  },
  getInitialState () {
    return {
      hovered: false
    };
  },
  getClassNames () {
    var classNames = [this.props.className];

    if (this.props.isActive) {
      classNames.push(this.props.activeClassName);
    }

    if (this.state.hovered) {
      classNames.push(this.props.hoverClassName);
    }

    return classNames.join(' ');
  },
  setHover (isHover) {
    this.setState({
      hovered: isHover
    });
  },
  tap () {
    // Call onClick indirectly so that React's Synthetic Touch Event doesn't propagate.
    // The resulting behavior should be that an options dropdown list can be scrolled
    // and only selects an option when a user has tapped an option without dragging the parent.
    this.props.onClick();
  },
  render () {
    return (
      // Safari ignores tabindex on buttons, and Firefox ignores tabindex on anchors
      // use a <div role="button">.
      <div
        role='button'
        className={this.getClassNames()}
        data-automation-id={this.props.automationId}
        tabIndex={-1}

        // This is a workaround for a long-standing iOS/React issue with click events.
        // See https://github.com/facebook/react/issues/134 for more information.
        onTouchStart={this.tap}

        onMouseDown={this.props.onClick}
        onMouseEnter={this.setHover.bind(this, true)}
        onMouseLeave={this.setHover.bind(this, false)}
        onKeyDown={this.props.onKeyDown}
        style={this.props.style}>
        {this.props.children}
      </div>
    );
  }
});

module.exports = classBase;
