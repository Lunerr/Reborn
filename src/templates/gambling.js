const { Command, Argument } = require('patron.js');
const { config } = require('../services/data.js');
const db = require('../services/database.js');
const number = require('../utilities/number.js');
const discord = require('../utilities/discord.js');
const trunc = 2;

class Gambling extends Command {
  constructor(names, description, odds, payout, preconditions = []) {
    super({
      names,
      groupName: 'economy',
      description,
      preconditions,
      args: [
        new Argument({
          name: 'bet',
          key: 'bet',
          type: 'cash',
          example: '500',
          preconditionOptions: [{ minimum: config.min_gamble }],
          preconditions: ['min', 'cash']
        })
      ]
    });
    this.odds = odds;
    this.payout = payout;
  }

  async run(msg, args) {
    const roll = number.roll();

    if (roll >= this.odds) {
      const winnings = args.bet * this.payout;
      const { cash } = db.add_cash(msg.author.id, msg.channel.guild.id, winnings);

      return discord.send_msg(
        msg, `You rolled: ${roll.toFixed(trunc)}. Congrats, you won \
${number.format(winnings)}. Balance: ${number.format(cash, true)}.`
      );
    }

    const { cash } = db.add_cash(msg.author.id, msg.channel.guild.id, -args.bet);

    return discord.send_msg(
      msg, `You rolled: ${roll.toFixed(trunc)}. Unfortunately, you lost \
${number.format(args.bet)}. Balance: ${number.format(cash, true)}.`
    );
  }
}

module.exports = Gambling;
