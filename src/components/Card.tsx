import * as React from 'react'
import { Circle, Square, Triangle } from './shapes'
import { Card, Details } from 'sets-game-engine'
import { Card as MaterialCard, CardContent, Grid, withWidth } from '@material-ui/core'
import { isWidthUp, isWidthDown } from '@material-ui/core/withWidth'
import { Breakpoint } from '@material-ui/core/styles/createBreakpoints'

interface Props {
    card: Card
    selected: boolean
    toggle?: () => void
    width: Breakpoint
}

const SHAPES = {
    [Details.Shape.TRIANGLE]: Triangle,
    [Details.Shape.SQUARE]:   Square,
    [Details.Shape.CIRCLE]:   Circle,
}

/** HSL for some nice material colors */
const COLORS = {
    [Details.Color.BLUE]: {
        hue: 207,
        saturation: 90,
        lightness: 58,
    },
    [Details.Color.GREEN]: {
        hue: 122,
        saturation: 39,
        lightness: 49,
    },
    [Details.Color.RED]: {
        hue: 4,
        saturation: 90,
        lightness: 58,
    },
}

const CardUI = ({card, selected, toggle, width}: Props) =>
    <Grid item container sm={4} xs={6} justify="center">
        <MaterialCard
            onClick={toggle}
            raised={selected}
            style={{
                width:    '100%',
                maxWidth: '20em',
                cursor:  'pointer',
                padding: '1.5em 0 1em'
            }}
        >
            <CardContent style={{height: '100%', padding: isWidthDown('xs', width) ? 0 : undefined}}>
                {[...Array(1 + card.quantity)].map((_, i) => {
                    const Shape = SHAPES[card.shape]
                    return <Shape
                        key={i}
                        size={1 + +isWidthUp('sm', width) + +isWidthUp('md', width)}
                        color={COLORS[card.color]}
                        opacity={card.opacity / 2}
                    /> })}
            </CardContent>
        </MaterialCard>
    </Grid>

export default withWidth()(CardUI)
