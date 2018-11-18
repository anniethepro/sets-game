import * as React from 'react'
import { Player, Game, Card, Events } from 'sets-game-engine'
import { Grid, Button, Icon, Typography, Paper, List, ListItem, ListItemText } from '@material-ui/core'
import Clock from './Clock'
import CardUI from './Card'
import Loading from './Loading';

type index = number
export type SetIndexs = [index, index, index]

export interface Props {
    // Total number of players in the game
    players: number

    // Randomize function
    rng: (max: number) => number

    // A name to match each player, should be empty or length of `player`
    names: string[]

    // If true, will not take set when button is pressed
    preventTakeAction: boolean

    // How long the user should be banned. (Don't provide to disbale banning)
    nextTimeout?: (oldTimeout: number) => number

    // Called when the main player trys to take a set
    onTakeAttempt?: (selected: SetIndexs) => void

    // Called when a card's selected status is changed
    onToggle?: (index: index) => void

    /*
    The action take a set from this game.
    This is given to parent/siblings to take sets on player's behalf.
    */
    takeSet?: (action: (player: index, set: SetIndexs) => boolean) => void
}

interface State {
    cards: ReadonlyArray<Card>
    selected: index[] // indexs of the cards in state
    bans: { [playerIndex: number]: number } // how far the player has progressed on their ban
    scores: number[]
    finished: boolean
}

export default class GameUI extends React.Component<Props, State> {

    private banHandles: WeakMap<Player, number> = new WeakMap

    // will be known at mount time
    private game!: Game
    private readonly players: Player[] = []

    readonly state: State = {
        cards: [],
        selected: [],
        bans: {},
        scores: (new Array(this.props.players)).fill(0),
        finished: false,
    }

    /** Defualts for single player mode */
    static defaultProps = {
        players: 1,
        preventTakeAction: false,
        names: [],
        rng: (max: number) => Math.floor(Math.random() * max),
        nextTimeout: (oldTimeout: number) => oldTimeout == 0
            ? 5 * 1000              // ban for 5 seconds by default
            : oldTimeout + 5 * 1000 // increase ban individually TODO, disable in solo mode
    }

    componentWillUnmount = () => this.game.removeAllListeners()

    componentDidMount() {
        // Make the game here in case our RNG method switches
        this.game = new Game({
            rng: this.props.rng,
            nextTimeout: this.props.nextTimeout,
        })
        this.players.length = 0 // clear player list

        for(let i = 0; i < this.props.players; i++) {
            let player = new Player
            this.players.push(player)
            this.game.addPlayer(player)
        }

        this.game.on(Events.start,          () => this.props.takeSet && this.props.takeSet(this.takeSet))
        this.game.on(Events.playerBanned,   this.onBan)
        this.game.on(Events.playerUnbanned, this.onUnban)
        this.game.on(Events.marketFilled,   () => this.setState({cards: [...this.game.playableCards]}))
        this.game.on(Events.marketGrab,     () => this.setState({scores: this.players.map(player => player.score)}))
        this.game.on(Events.finish,         () => this.setState({finished: true}))

        this.game.start()
    }

    /** Action to take a set from the deck for a player */
    takeSet = (player: index, set: SetIndexs) => {
        this.setState({selected: []})
        return this.players[player].takeSet(...set)
    }

    /** Main player tries to take a set */
    private takeSetAttempt = () => {
        if (this.props.onTakeAttempt)
            this.props.onTakeAttempt(this.state.selected as SetIndexs)
        if (!this.props.preventTakeAction)
            this.takeSet(0, this.state.selected as SetIndexs)
    }

    /** Main player toggles a card */
    private toggleCard = (index: index) => {
        const { selected } = this.state
        if (selected.includes(index))
            selected.splice(selected.indexOf(index), 1)
        else
            selected.push(index)
        if (this.props.onToggle)
            this.props.onToggle(index)
        this.setState({selected})
    }

    /** When any player is banned */
    private onBan = ({player, timeout} : {player: Player, timeout: number}) => {
        // clear original timer if they are somehow banned already
        if (this.banHandles.has(player))
            clearInterval(this.banHandles.get(player))

        const index = this.players.indexOf(player),
              startTime = Date.now()

        this.setState({bans: { [index]: 1 } })

        this.banHandles.set(
            player,
            setInterval(
                () => this.state.bans[index] && // premature unban
                    this.setState({ bans: { [index]: (Date.now() - startTime) / timeout * 100 } }),
                Math.ceil(1000 / 60) // try to update every frame
            ) as unknown as number
        )
    }

    /** When any player is unbanned */
    private onUnban = (player: Player) => {
        const index = this.players.indexOf(player)
        const { bans } = this.state
        delete bans[index]
        clearInterval(this.banHandles.get(player))
        this.banHandles.delete(player)
        this.setState({bans})
    }

    render = () => !this.state.finished
        ? <>
            {this.state.cards.map((card, i) =>
                <CardUI
                    key={i}
                    card={card}
                    selected={this.state.selected.includes(i)}
                    toggle={() => this.toggleCard(i)}
                /> )}
            <Grid container style={{marginTop: '2em'}} justify="space-around" spacing={24}>
                <Grid item sm xs={12}>
                    <Button
                        variant="contained"
                        color="primary"
                        aria-label="Take Set"
                        disabled={this.state.selected.length != 3 || !!this.state.bans[0]}
                        onClick={this.takeSetAttempt}
                        size="large"
                    >
                        <Icon style={{margin: '.5em 1em .5em 0'}}>done_outline</Icon>
                        Take Set
                        {this.state.bans[0] && // main player is banned
                            <Loading
                                variant="determinate"
                                color="secondary"
                                value={this.state.bans[0]} /> }
                    </Button>
                </Grid>
                <Grid item sm xs={12}>
                    {this.props.players == 1
                        ? // Just show a sentence in solo mode
                        <Typography variant="h5">
                            {this.state.scores[0] == 0
                                ? 'You have not collected any sets yet'
                                : `You have collected ${this.state.scores[0]} set${this.state.scores[0] > 1 ? 's' : ''}`}
                        </Typography>
                        : // Leaderboard
                        <Paper>
                            <List>
                                {this.props.names.map((name, index) =>
                                    <ListItem key={index} disabled={!!this.state.bans[index]}>
                                        <ListItemText>
                                            <Typography variant="overline" style={{float: 'right'}}>{this.state.scores[index]}</Typography>
                                            {name}
                                        </ListItemText>
                                        {this.state.bans[index] && // player is banned
                                            <Loading
                                                variant="determinate"
                                                color="secondary"
                                                value={this.state.bans[index]} />}
                                    </ListItem> )}
                            </List>
                        </Paper> }
                </Grid>
                <Grid item sm>
                    <Clock />
                </Grid>
            </Grid>
        </>
        : // TODO Show winners once game is finished.
        <Typography>
            All done.
            <pre>{JSON.stringify(this.game.winners, null, 2)}</pre>
        </Typography>

}