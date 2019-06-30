/* eslint-disable no-extend-native */

Object.defineProperty(Object.prototype, 'boldified', {
  get() {
    const str = this.mention ? this.mention : this.toString();

    return `**${str.replace(/(\*|~|`|_)+/g, '')}**`;
  }
});
