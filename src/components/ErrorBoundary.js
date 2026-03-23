import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null, info: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        this.setState({ info: info?.componentStack || String(error) });
        console.error(error, info);
    }

    render() {
        if (this.state.error) {
            return (
                <View style={styles.box}>
                    <Text style={styles.title}>Something went wrong</Text>
                    <Text style={styles.msg}>{String(this.state.error?.message || this.state.error)}</Text>
                    {this.state.info ? (
                        <ScrollView style={styles.stack}>
                            <Text style={styles.stackText}>{this.state.info}</Text>
                        </ScrollView>
                    ) : null}
                </View>
            );
        }
        return this.props.children;
    }
}

const styles = StyleSheet.create({
    box: {
        flex: 1,
        padding: 24,
        backgroundColor: '#1a1a2e',
        justifyContent: 'center',
    },
    title: { color: '#ff6b6b', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
    msg: { color: '#e0e0e0', marginBottom: 16 },
    stack: { maxHeight: 200 },
    stackText: { color: '#888', fontSize: 11, fontFamily: 'monospace' },
});
